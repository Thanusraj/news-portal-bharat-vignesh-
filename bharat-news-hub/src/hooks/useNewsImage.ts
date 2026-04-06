import { useState, useEffect } from "react";
import { DEFAULT_FALLBACK, getFallbackImageFast } from "@/services/unsplashApi";

export function useNewsImage(imageUrl: string | null, keyword: string) {
  const [src, setSrc] = useState(imageUrl || DEFAULT_FALLBACK);
  const [loaded, setLoaded] = useState(Boolean(imageUrl));
  const [fallbackRequested, setFallbackRequested] = useState(false);

  useEffect(() => {
    setFallbackRequested(false);
    setLoaded(Boolean(imageUrl));
    if (!imageUrl) {
      const { placeholder, upgrade } = getFallbackImageFast(keyword);
      setSrc(placeholder);
      void upgrade.then((resolved) => {
        setSrc(resolved);
      });
      return;
    }
    setSrc(imageUrl);
  }, [imageUrl, keyword]);

  const handleImageError = () => {
    if (fallbackRequested) return;
    setFallbackRequested(true);
    const { placeholder, upgrade } = getFallbackImageFast(keyword);
    setSrc(placeholder);
    void upgrade.then((fallback) => {
      setSrc(fallback);
      setLoaded(true);
    });
  };

  const handleImageLoad = () => {
    setLoaded(true);
  };

  return { src, loaded, handleImageError, handleImageLoad };
}
