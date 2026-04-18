/**
 * ImageUploader  -- Reusable drag-drop image upload component v1.0
 * Used across profiles, suppliers, items, documents
 */
import { useRef } from "react";
import { useImageUpload, useDragDrop } from "@/hooks/useImageUpload";
import { Upload, X, Check, Loader2, Image as ImgIcon } from "lucide-react";
import { T } from "@/lib/theme";

interface Props {
  type?: "profile"|"supplier"|"item"|"document"|"facility"|"general";
  folder?: string;
  onUploaded?: (url: string, path: string) => void;
  current?: string;
  label?: string;
  size?: "sm"|"md"|"lg";
  circle?: boolean;
  accept?: string;
}

export default function ImageUploader({
  type = "general", folder, onUploaded, current, label,
  size = "md", circle = false, accept = "image/*"
}: Props) {
  const { upload, uploading, progress, error, result, reset } = useImageUpload(type);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const res = await upload(file, folder);
    if (res && onUploaded) onUploaded(res.url, res.path);
  };

  const { dragging, onDragOver, onDragLeave, onDrop } = useDragDrop(handle);

  const dim = size === "sm" ? 72 : size === "lg" ? 160 : 110;
  const imgSrc = result?.url || current;

  return (
    <div style={{ display:"inline-block" }}>
      <input
        ref={inputRef} type="file" accept={accept} style={{ display:"none" }}
        onChange={e => e.target.files && handle(Array.from(e.target.files))}
      />
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        style={{
          width: dim, height: dim,
          borderRadius: circle ? "50%" : T.rLg,
          border: `2px dashed ${dragging ? T.primary : error ? T.error : imgSrc ? T.border : T.borderHov}`,
          background: dragging ? `${T.primary}18` : T.bg2,
          cursor: uploading ? "wait" : "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
          transition: "border-color .2s, background .2s",
        }}
      >
        {imgSrc && !uploading && (
          <img src={imgSrc} alt="upload"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", borderRadius: circle ? "50%" : T.rLg - 2 }} />
        )}

        {uploading && (
          <div style={{ position:"absolute", inset:0, background:"rgba(10,22,40,.8)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Loader2 size={24} color={T.primary} style={{ animation:"spin 1s linear infinite" }} />
            <div style={{ width:"70%", height:3, background:T.bg, borderRadius:2 }}>
              <div style={{ width:`${progress}%`, height:"100%", background:T.primary, borderRadius:2, transition:"width .3s" }} />
            </div>
            <span style={{ fontSize:10, color:T.fgMuted }}>{progress}%</span>
          </div>
        )}

        {!imgSrc && !uploading && (
          <div style={{ textAlign:"center", padding:8 }}>
            <Upload size={size === "sm" ? 18 : 24} color={dragging ? T.primary : T.fgDim} />
            {size !== "sm" && (
              <div style={{ fontSize:10, color:T.fgDim, marginTop:6, lineHeight:1.4 }}>
                {label || "Click or drop"}<br />to upload
              </div>
            )}
          </div>
        )}

        {result && !uploading && (
          <div style={{ position:"absolute", bottom:4, right:4,
            width:18, height:18, borderRadius:"50%",
            background:T.success, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Check size={11} color="#fff" />
          </div>
        )}

        {imgSrc && !uploading && (
          <button
            onClick={e => { e.stopPropagation(); reset(); onUploaded?.("",""); }}
            style={{ position:"absolute", top:4, right:4, width:20, height:20,
              borderRadius:"50%", background:"rgba(0,0,0,.6)", border:"none",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
            <X size={11} color="#fff" />
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize:10, color:T.error, marginTop:4, maxWidth:dim }}>{error}</div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
