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
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pages = printRef.current.querySelectorAll('[style*="pageBreakAfter"], [style*="page-break-after"]');
      const pageElements = pages.length > 0 ? Array.from(pages) : [printRef.current.firstElementChild];

      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;
        
        if (!pageElement) continue;

        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      pdf.save("dnd-monster-cards.pdf");
      toast.success("PDF generated successfully!");
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
            {Math.ceil(monsters.length / 4)} page{Math.ceil(monsters.length / 4) !== 1 ? "s" : ""}
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

      {/* Visible preview */}
      <div className="border border-border rounded-lg overflow-auto max-h-[600px] bg-secondary/30">
        <div className="transform scale-50 origin-top-left" style={{ width: "200%" }}>
          <PrintPreview monsters={monsters} />
        </div>
      </div>
    </div>
  );
}
