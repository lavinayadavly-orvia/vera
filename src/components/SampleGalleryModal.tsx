import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SampleGallery } from '@/components/SampleGallery';
import type { Sample } from '@/services/sampleRepository';

interface SampleGalleryModalProps {
  samples: Sample[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSample?: (sample: Sample) => void;
}

export function SampleGalleryModal({ 
  samples, 
  open, 
  onOpenChange,
  onSelectSample 
}: SampleGalleryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sample Gallery</DialogTitle>
          <DialogDescription>
            Browse inspiring examples created with DoneandDone. All samples use 100% free, non-licensed images and icons.
          </DialogDescription>
        </DialogHeader>
        <SampleGallery samples={samples} onSelectSample={onSelectSample} />
      </DialogContent>
    </Dialog>
  );
}
