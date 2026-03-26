import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Info } from 'lucide-react';
import type { Sample } from '@/services/sampleRepository';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SampleGalleryProps {
  samples: Sample[];
  onSelectSample?: (sample: Sample) => void;
}

export function SampleGallery({ samples, onSelectSample }: SampleGalleryProps) {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [filterContentType, setFilterContentType] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');

  // Get unique content types and tags for filters
  const contentTypes = Array.from(new Set(samples.map((s) => s.contentType)));
  const allTags = Array.from(new Set(samples.flatMap((s) => s.tags)));

  // Filter samples
  const filteredSamples = samples.filter((sample) => {
    if (filterContentType && sample.contentType !== filterContentType) return false;
    if (filterTag && !sample.tags.includes(filterTag)) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">Filter by Content Type</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterContentType === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterContentType('')}
            >
              All
            </Button>
            {contentTypes.map((type) => (
              <Button
                key={type}
                variant={filterContentType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterContentType(type)}
              >
                {type.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Filter by Tag</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterTag === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTag('')}
              >
                All Tags
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={filterTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSamples.length > 0 ? (
          filteredSamples.map((sample) => (
            <Card key={sample.id} className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer">
              {/* Preview Image */}
              <div className="relative w-full aspect-video bg-muted overflow-hidden">
                <img
                  src={sample.previewImage.url}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedSample(sample);
                      onSelectSample?.(sample);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-base mb-1">{sample.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{sample.description}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {sample.contentType.replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {sample.format.toUpperCase()}
                  </Badge>
                </div>

                {/* Tags */}
                {sample.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sample.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {sample.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{sample.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setSelectedSample(sample)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No samples found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {selectedSample && (
        <Dialog open={!!selectedSample} onOpenChange={(open) => !open && setSelectedSample(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSample.title}</DialogTitle>
              <DialogDescription>{selectedSample.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Preview Image */}
              <div>
                <h4 className="font-semibold mb-2">Preview</h4>
                <img
                  src={selectedSample.previewImage.url}
                  alt={selectedSample.title}
                  className="w-full rounded-lg border"
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Content Type</h4>
                  <p className="font-medium capitalize">{selectedSample.contentType.replace('-', ' ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Format</h4>
                  <p className="font-medium uppercase">{selectedSample.format}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Created</h4>
                  <p className="font-medium">{new Date(selectedSample.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Assets Count</h4>
                  <p className="font-medium">{selectedSample.assets.length} asset(s)</p>
                </div>
              </div>

              {/* Tags */}
              {selectedSample.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSample.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Assets Used */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Free Assets Used</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                        ✓
                      </div>
                      <div>
                        <h5 className="font-medium text-sm text-green-900 dark:text-green-100">100% Free & Licensed</h5>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                          All images and icons are from approved free sources
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assets List */}
                  <div className="mt-3 space-y-2">
                    {selectedSample.assets.map((asset, index) => (
                      <div
                        key={asset.id}
                        className="p-2 bg-muted rounded-md text-xs space-y-1 border border-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{asset.source}</span>
                          <span className="text-muted-foreground">{asset.license}</span>
                        </div>
                        {asset.attribution && (
                          <div className="text-muted-foreground italic">{asset.attribution}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview URL Link */}
              <div>
                <a
                  href={selectedSample.previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                >
                  View on {selectedSample.previewImage.source}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}