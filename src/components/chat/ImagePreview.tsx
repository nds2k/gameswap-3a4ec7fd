import { X, Image as ImageIcon } from "lucide-react";

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

export const ImagePreview = ({ file, onRemove }: ImagePreviewProps) => {
  const previewUrl = URL.createObjectURL(file);

  return (
    <div className="relative mx-4 mb-2">
      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted">
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-full object-cover"
          onLoad={() => URL.revokeObjectURL(previewUrl)}
        />
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
};
