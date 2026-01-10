import { useRef, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Monster } from "@/types/monster";
import { PrintPreview } from "./PrintPreview";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface PDFGeneratorProps {
  monsters: Monster[];
}

export function PDFGenerator({ monsters }: PDFGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!printRef.current || monsters.length === 0) {
      toast.error("Add at least one monster to generate a PDF");
      return;
    }

    setIsGenerating(true);

    try {
      // A4 landscape dimensions
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageElements = printRef.current.children;

      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;
        
        if (!pageElement) continue;

        const canvas = await html2canvas(pageElement, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
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
      toast.success("PDF generated successfully! Print and fold cards horizontally.");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-xl text-foreground">Print Preview</h2>
          <p className="text-sm text-muted-foreground">
            {monsters.length} card{monsters.length !== 1 ? "s" : ""} • 
            {Math.ceil(monsters.length / 4)} page{Math.ceil(monsters.length / 4) !== 1 ? "s" : ""} (A4 Landscape)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Fold each card horizontally in the middle to create tent cards
          </p>
        </div>
        <Button
          onClick={generatePDF}
          disabled={monsters.length === 0 || isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Hidden print preview for PDF generation */}
      <div className="overflow-hidden" style={{ position: "absolute", left: "-9999px" }}>
        <PrintPreview ref={printRef} monsters={monsters} />
      </div>

      {/* Visible preview - scaled down */}
      <div className="border border-border rounded-lg overflow-auto max-h-[500px] bg-secondary/30 p-4">
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
