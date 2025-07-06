import { getImageProps, ImageProps } from "next/image";

export async function preloadNextImage(imageProps: Omit<ImageProps, "alt">) {
  try {
    // Get the same props that Next.js Image would use
    const { props } = getImageProps({ ...imageProps, alt: "" });

    // Extract the srcSet from the props
    const { srcSet } = props;

    if (srcSet) {
      // Parse the srcSet to get the URLs
      const srcSetUrls = srcSet.split(", ").map((s) => s.split(" ")[0]);

      // Preload each URL in the srcSet
      await Promise.all(
        srcSetUrls.map((url) => {
          return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(undefined);
            img.onerror = () => resolve(undefined);
            img.src = url;
          });
        }),
      );
    }
  } catch (error) {
    console.error("Error preloading Next.js image:", error);
  }
}
