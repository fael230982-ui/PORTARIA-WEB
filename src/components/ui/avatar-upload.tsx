'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Upload, Camera, X } from 'lucide-react';

type AvatarUploadProps = {
  onChange: (file: File | null) => void;
  preview?: string;
  className?: string;
};

export function AvatarUpload({ onChange, preview, className = '' }: AvatarUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onChange(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(e.type === 'dragover');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
    }
  };

  const removePhoto = () => {
    onChange(null);
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (preview) {
    return (
      <div className={`relative ${className}`}>
        <Avatar className="h-32 w-32">
          <AvatarImage src={preview} alt="Preview do avatar" />
          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
            <Camera className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 text-white hover:bg-red-500"
          onClick={removePhoto}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative h-32 w-32 rounded-full border-2 border-dashed border-white/20 bg-slate-900/50 p-4 transition-colors ${
        dragActive ? 'border-cyan-400 bg-slate-800/50' : 'hover:border-white/40'
      } ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <label htmlFor="avatar-upload" className="cursor-pointer">
        <div className="flex h-full w-full flex-col items-center justify-center">
          <Upload className="h-6 w-6 text-slate-400" />
          <p className="mt-2 text-xs text-slate-400">Adicionar foto</p>
        </div>
      </label>
      {dragActive && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-cyan-500/10">
          <p className="text-xs text-cyan-400">Solte a imagem aqui</p>
        </div>
      )}
    </div>
  );
}
