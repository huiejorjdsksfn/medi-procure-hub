/**
 * useImageUpload  -- Supabase Storage upload hook v1.0
 * Handles profile photos, supplier logos, document attachments, item images
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  url: string;
  path: string;
  bucket: string;
}

export interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  result: UploadResult | null;
}

const BUCKETS: Record<string, string> = {
  profile:   "avatars",
  supplier:  "suppliers",
  item:      "items",
  document:  "documents",
  facility:  "facilities",
  general:   "uploads",
};

export function useImageUpload(type: keyof typeof BUCKETS = "general") {
  const [state, setState] = useState<UploadState>({
    uploading: false, progress: 0, error: null, result: null
  });

  const upload = useCallback(async (
    file: File,
    folder?: string
  ): Promise<UploadResult | null> => {
    setState({ uploading: true, progress: 0, error: null, result: null });

    try {
      // Validate
      const maxMB = type === "document" ? 20 : 5;
      if (file.size > maxMB * 1024 * 1024) {
        throw new Error(`File too large (max ${maxMB}MB)`);
      }
      const allowed = ["image/jpeg","image/png","image/webp","image/gif","application/pdf"];
      if (!allowed.includes(file.type)) {
        throw new Error("File type not supported");
      }

      setState(s => ({ ...s, progress: 20 }));

      // Unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const ts  = Date.now();
      const rnd = Math.random().toString(36).slice(2, 8);
      const path = folder
        ? `${folder}/${ts}-${rnd}.${ext}`
        : `${ts}-${rnd}.${ext}`;

      const bucket = BUCKETS[type];
      setState(s => ({ ...s, progress: 40 }));

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (upErr) throw upErr;
      setState(s => ({ ...s, progress: 80 }));

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setState(s => ({ ...s, progress: 100 }));

      const result = { url: data.publicUrl, path, bucket };
      setState({ uploading: false, progress: 100, error: null, result });
      return result;

    } catch (e: any) {
      const error = e?.message || "Upload failed";
      setState({ uploading: false, progress: 0, error, result: null });
      return null;
    }
  }, [type]);

  const reset = useCallback(() => {
    setState({ uploading: false, progress: 0, error: null, result: null });
  }, []);

  return { ...state, upload, reset };
}

/** Drag-and-drop file handler */
export function useDragDrop(onDrop: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onDrop(files);
  }, [onDrop]);

  return { dragging, onDragOver, onDragLeave, onDrop: handleDrop };
}

import type React from "react";
