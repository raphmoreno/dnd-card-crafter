import { useRef, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Monster } from "@/types/monster";
import { PrintPreview } from "./PrintPreview";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { trackPDFDownload } from "@/lib/analytics";

interface PDFGeneratorProps {
  monsters: Monster[];
}

export function PDFGenerator({ monsters }: PDFGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const convertImageToBase64 = async (imgSrc: string): Promise<string> => {
    // If image is already a data URL, return it
    if (imgSrc.startsWith('data:')) {
      return imgSrc;
    }

    // Images are now local, so we can fetch them directly
    try {
      const response = await fetch(imgSrc, {
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn('Failed to fetch local image:', error);
    }

    // Fallback: return original (html2canvas might still be able to capture it)
    return imgSrc;
  };

  const preloadImages = async (element: HTMLElement): Promise<void> => {
    const images = element.querySelectorAll('img');
    const imagePromises: Promise<void>[] = [];

    images.forEach((img) => {
      if (img.src && !img.src.startsWith('data:') && !img.complete) {
        const promise = (async () => {
          try {
            // Wait for the image to be fully loaded first
            await waitForSingleImage(img);
            
            // For local images, convert to base64 for better PDF rendering
            const base64 = await convertImageToBase64(img.src);
            if (base64 && base64.startsWith('data:')) {
              img.src = base64;
            }
          } catch (error) {
            console.warn('Failed to preload/convert image:', error);
          }
        })();
        
        imagePromises.push(promise);
      }
    });

    await Promise.all(imagePromises);
    // Wait a bit more for images to render in DOM
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  const waitForSingleImage = (img: HTMLImageElement): Promise<void> => {
    return new Promise((resolve) => {
      if (img.complete && img.naturalHeight !== 0) {
        resolve();
        return;
      }

      img.onload = () => resolve();
      img.onerror = () => resolve(); // Continue even on error
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(), 5000);
    });
  };

  const waitForImages = (element: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      const images = element.querySelectorAll('img');
      if (images.length === 0) {
        resolve();
        return;
      }

      let loadedCount = 0;
      const totalImages = images.length;

      images.forEach((img) => {
        if (img.complete && img.naturalHeight !== 0) {
          // Image already loaded
          loadedCount++;
          if (loadedCount === totalImages) {
            resolve();
          }
        } else {
          // Wait for image to load or error
          img.onload = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
              resolve();
            }
          };
          img.onerror = () => {
            // Even if image fails to load, continue
            loadedCount++;
            if (loadedCount === totalImages) {
              resolve();
            }
          };
        }
      });

      // Set a timeout to avoid infinite waiting
      setTimeout(() => {
        resolve();
      }, 15000); // 15 second timeout
    });
  };

  const generatePDF = async () => {
    // Use the hidden ref for PDF generation (it has correct dimensions)
    const targetElement = printRef.current;
    
    if (!targetElement || monsters.length === 0) {
      toast.error("Add at least one monster to generate a PDF");
      return;
    }

    setIsGenerating(true);
    toast.info("Preparing images for PDF generation...");

    // Get the container element
    const containerElement = targetElement.parentElement as HTMLElement;
    
    // Store original styles for restoration
    const originalStyles = containerElement ? {
      position: containerElement.style.position || '',
      left: containerElement.style.left || '',
      top: containerElement.style.top || '',
      opacity: containerElement.style.opacity || '',
      visibility: containerElement.style.visibility || '',
      zIndex: containerElement.style.zIndex || '',
    } : null;

    try {
      // Temporarily make the element visible and positioned for html2canvas
      // html2canvas works best with visible elements, so we'll make it visible but off-screen

      if (containerElement) {
        // Position off-screen but still accessible to html2canvas
        // Using negative left to position just outside viewport
        containerElement.style.position = 'fixed';
        containerElement.style.left = '-297mm';
        containerElement.style.top = '0';
        containerElement.style.opacity = '1';
        containerElement.style.visibility = 'visible';
        containerElement.style.zIndex = '99999';
        // Ensure proper dimensions
        containerElement.style.width = '297mm';
        // Wait for reflow
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Preload and convert images to base64 to avoid CORS issues
      await preloadImages(targetElement);
      
      // Wait for all images to load
      await waitForImages(targetElement);
      
      // Additional small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // A4 landscape dimensions
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageElements = targetElement.children;

      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;
        
        if (!pageElement) continue;

        // Wait for images on this page
        await waitForImages(pageElement);
        await new Promise(resolve => setTimeout(resolve, 200));

        // Convert all images on this page to base64 before capturing (for better PDF rendering)
        const pageImages = pageElement.querySelectorAll('img');
        const conversionPromises: Promise<void>[] = [];
        
        for (const img of Array.from(pageImages)) {
          if (img.src && !img.src.startsWith('data:')) {
            const promise = (async () => {
              try {
                const base64 = await convertImageToBase64(img.src);
                if (base64 && base64.startsWith('data:')) {
                  // Update image source and wait for it to load
                  await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Continue even if load fails
                    img.src = base64;
                    
                    // Timeout after 2 seconds
                    setTimeout(() => resolve(), 2000);
                  });
                }
              } catch (error) {
                console.warn('Could not convert image to base64:', error);
              }
            })();
            
            conversionPromises.push(promise);
          }
        }
        
        // Wait for all image conversions to complete
        await Promise.all(conversionPromises);
        
        // Wait a bit more for DOM to update
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(pageElement, {
          scale: 3,
          useCORS: true,
          allowTaint: false, // Keep false since we converted images to base64
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          removeContainer: false,
          windowWidth: 1123, // 297mm at 96dpi
          windowHeight: 794, // 210mm at 96dpi
        });

        const imgData = canvas.toDataURL("image/png");
        // A4 landscape: 297mm x 210mm
        const imgWidth = 297;
        const imgHeight = 210;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      pdf.save("dnd-monster-cards.pdf");
      
      // Track PDF download
      const pageCount = Math.ceil(monsters.length / 4);
      trackPDFDownload(monsters.length, pageCount);
      
      toast.success("PDF generated successfully! Print and fold cards horizontally.");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      // Restore original visibility
      if (containerElement && originalStyles) {
        containerElement.style.position = originalStyles.position || 'fixed';
        containerElement.style.left = originalStyles.left || '-100vw';
        containerElement.style.top = originalStyles.top || '0';
        containerElement.style.opacity = originalStyles.opacity || '0';
        containerElement.style.visibility = originalStyles.visibility || 'visible';
        containerElement.style.zIndex = originalStyles.zIndex || '-9999';
      }
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (monsters.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="font-display text-lg mb-2">No cards to preview</p>
        <p className="text-sm">Add monsters from the Search or Selected tabs to see a preview</p>
      </div>
    );
  }

  const pageCount = Math.ceil(monsters.length / 4);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="font-display text-xl font-semibold text-gray-900">Card Preview</h2>
        <div className="flex gap-3">
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2 border-gray-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
        </div>
      </div>

      {/* Printing Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Printing Instructions:</h3>
        <p className="text-sm text-gray-700 mb-2">
          Cards are designed for A4 landscape printing. Each card is 200mm x 72mm. Print and fold horizontally along the dashed line. The monster image faces players, and the stat block faces you (the DM).
        </p>
        <p className="text-sm font-medium text-gray-900">
          Total cards: {monsters.length} • Pages needed: {pageCount}
        </p>
      </div>

      {/* Hidden print preview for PDF generation - invisible but renderable for html2canvas */}
      <div 
        style={{ 
          position: "fixed", 
          left: "-100vw",
          top: "0",
          width: "297mm",
          height: "auto",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -9999
        }}
      >
        <PrintPreview ref={printRef} monsters={monsters} />
      </div>

      {/* Visible preview - scaled down */}
      <div className="border border-gray-200 rounded-lg overflow-auto max-h-[600px] bg-gray-50 p-4">
        <div 
          className="origin-top-left"
          style={{ 
            transform: "scale(0.35)",
            transformOrigin: "top left",
            width: "297mm",
          }}
        >
          <PrintPreview monsters={monsters} />
        </div>
      </div>
    </div>
  );
}
