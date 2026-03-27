import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResult {
  matched: number;
  notFound: string[];
  total: number;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function similarity(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const matrix: number[][] = [];
  for (let i = 0; i <= la; i++) matrix[i] = [i];
  for (let j = 0; j <= lb; j++) matrix[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return 1 - matrix[la][lb] / Math.max(la, lb);
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if ((char === "," || char === ";") && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  });
}

export const CSVImportModal = ({ open, onOpenChange, onSuccess }: CSVImportModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setFileName(file.name);
    setImporting(true);
    setResult(null);
    setProgress(0);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("Fichier vide");

      const headers = rows[0].map(h => h.toLowerCase());
      const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("nom") || h.includes("name") || h.includes("jeu"));
      if (titleIdx === -1) throw new Error("Colonne 'titre' introuvable. Assurez-vous que votre CSV contient une colonne 'title', 'nom' ou 'name'.");

      const conditionIdx = headers.findIndex(h => h.includes("condition") || h.includes("état") || h.includes("etat"));
      const dataRows = rows.slice(1).filter(r => r[titleIdx]?.trim());

      // Fetch master games for fuzzy matching
      const { data: masterGames } = await supabase.from("master_games").select("id, normalized_title, title").limit(1000);
      const masterList = masterGames || [];

      let matched = 0;
      const notFound: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const title = row[titleIdx].trim();
        const condition = conditionIdx >= 0 ? row[conditionIdx]?.trim() : null;
        const normalized = normalizeTitle(title);

        // Find best match
        let bestId: string | null = null;
        let bestScore = 0;

        for (const mg of masterList) {
          const score = similarity(normalized, mg.normalized_title);
          if (score > bestScore) { bestScore = score; bestId = mg.id; }
        }

        if (bestScore >= 0.75 && bestId) {
          // Check if already in collection
          const { data: existing } = await supabase
            .from("user_collections")
            .select("id")
            .eq("user_id", user.id)
            .eq("game_id", bestId)
            .maybeSingle();

          if (!existing) {
            await supabase.from("user_collections").insert({
              user_id: user.id,
              game_id: bestId,
              condition: condition || "good",
            });
          }
          matched++;
        } else {
          notFound.push(title);
        }

        setProgress(Math.round(((i + 1) / dataRows.length) * 100));
      }

      setResult({ matched, notFound, total: dataRows.length });
      if (matched > 0) {
        toast({ title: `${matched} jeux importés !`, description: `${notFound.length} non trouvés.` });
        onSuccess?.();
      }
    } catch (err: any) {
      toast({ title: "Erreur d'import", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!importing) {
      setResult(null);
      setFileName(null);
      setProgress(0);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importer une collection
          </DialogTitle>
          <DialogDescription>
            Importez vos jeux depuis un fichier CSV (MyLudo, BGG, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <div
                onClick={() => !importing && fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  importing ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
                {importing ? (
                  <div className="space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm font-medium">Import en cours...</p>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progress}%</p>
                  </div>
                ) : (
                  <>
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">
                      {fileName || "Glissez un fichier CSV ou cliquez"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formats supportés : CSV avec colonnes titre, condition
                    </p>
                  </>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Format attendu :</p>
                <p>title,condition</p>
                <p>Catan,Bon état</p>
                <p>7 Wonders,Neuf</p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Check className="h-6 w-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{result.matched} jeux importés</p>
                  <p className="text-xs text-muted-foreground">sur {result.total} lignes</p>
                </div>
              </div>

              {result.notFound.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold">{result.notFound.length} non trouvés</p>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.notFound.map((title, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {title}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => handleClose(false)} className="w-full">
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
