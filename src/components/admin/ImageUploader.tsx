import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { tokenStore } from "@/services/apiClient";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, maxImages = 10 }: ImageUploaderProps) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 5 * 1024 * 1024
    );
    if (validFiles.length === 0) {
      toast.error("Lubatud on ainult JPG, PNG või WebP failid (max 5MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach(f => formData.append("files", f));

      const token = tokenStore.getAccess();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_URL || "";
      const uploadUrl = apiBase.replace(/\/api$/, "") + "/api/images/upload";

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const results = await res.json();
      const newUrls = Array.isArray(results)
        ? results.map((r: any) => r.full || r.url || r)
        : [results.full || results.url || results];
      onChange([...images, ...newUrls].slice(0, maxImages));
      toast.success(`${newUrls.length} pilt(i) üles laetud`);
    } catch {
      toast.error(t("toast.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={i} className="group relative h-20 w-20 rounded-lg overflow-hidden border border-border">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-accent"); }}
            onDragLeave={e => e.currentTarget.classList.remove("border-accent")}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("border-accent"); handleFiles(e.dataTransfer.files); }}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent"
          >
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <Upload className="h-5 w-5" />}
            <span className="text-[9px]">
              {uploading ? "Laen üles..." : "Lisa pilt"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
