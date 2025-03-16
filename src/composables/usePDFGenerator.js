import { nextTick, computed } from "vue";
import { jsPDF } from "jspdf";
import { useDomainStore } from "@/stores/useDomainStore";

export function usePDFGenerator(unitName, month, recorder, className, isGeneratingPDF, pdfGenerated, popupMessage) {
  const domainStore = useDomainStore();
  const domains = computed(() => domainStore.domains);
  const loadFont = async (filename) => {
    const BASE_URL = import.meta.env.BASE_URL || "/";
    const url = `${BASE_URL}fonts/${filename}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load font: ${url}`);

    const fontData = await response.arrayBuffer();
    const binaryString = new Uint8Array(fontData).reduce((acc, byte) => acc + String.fromCharCode(byte), "");

    return btoa(binaryString);
  };

  const loadFonts = async () => {
    const fontRegular = await loadFont("NotoSansTC-Regular.ttf");
    const fontBold = await loadFont("NotoSansTC-Bold.ttf");

    if (!fontRegular || !fontBold) {
      throw new Error("字體載入失敗，字體資料為空");
    }

    return { fontRegular, fontBold };
  };

  const getRotatedImage = (image, angle) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (angle === 90 || angle === 270) {
      canvas.width = image.height;
      canvas.height = image.width;
    } else {
      canvas.width = image.width;
      canvas.height = image.height;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    const result = canvas.toDataURL();
    return result;
  };

  let headerStartY = 15;
  let startX = 10;
  let startY = headerStartY + 20;
  let columnWidths = [35, 85, 70];
  let rowHeight = 40;
  const headHeight = 6;
  const tableWidth = columnWidths.reduce((acc, w) => acc + w, 0);
  const rowCount = domains.value.length;

  const drawHeader = (pdf, unitName, month, className, recorder) => {
    pdf.setFont("NotoSansTC-Bold", "bold");
    pdf.setFontSize(18);
    pdf.text("臺北市私立長藤托嬰中心", 70, headerStartY);

    pdf.setFont("NotoSansTC", "normal");
    pdf.setFontSize(12);
    pdf.text(`單元名稱: ${unitName.value}`, 10, headerStartY + 15);
    pdf.text(`年月: ${month.value}`, 60, headerStartY + 15);
    pdf.text(`班級: ${className.value}`, 110, headerStartY + 15);
    pdf.text(`記錄者: ${recorder.value}`, 150, headerStartY + 15);
  };

  const drawTable = (pdf) => {
    pdf.setLineWidth(0.5);
    pdf.rect(startX, startY, tableWidth, headHeight + rowHeight * rowCount);
    let domainCenterX = startX + columnWidths[0] / 2;
    let photoCenterX = startX + columnWidths[0] + columnWidths[1] / 2;
    let descriptionCenterX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] / 2;
    let headerY = startY + headHeight - 1.5;

    pdf.text("發展領域", domainCenterX, headerY, { align: "center" });
    pdf.text("照片", photoCenterX, headerY, { align: "center" });
    pdf.text("說明", descriptionCenterX, headerY, { align: "center" });

    for (let i = 0; i < rowCount; i++) {
      let yPos = startY + headHeight + i * rowHeight;

      let domainText = pdf.splitTextToSize(domains.value[i].name, columnWidths[0] - 10);
      let domainStartX = startX + columnWidths[0] / 2;
      let domainCenterY = yPos + rowHeight / 2;

      pdf.line(startX, yPos, startX + tableWidth, yPos);
      addDomainName(pdf, domainText, domainStartX, domainCenterY);

      let descriptionWidth = columnWidths[2] - 7;
      let wrappedText = pdf.splitTextToSize(domains.value[i].description, descriptionWidth);
      let descriptionStartX = startX + columnWidths[0] + columnWidths[1] + 3;
      let descriptionCenterY = yPos;

      addDescription(pdf, wrappedText, descriptionStartX, descriptionCenterY, descriptionWidth, rowHeight);
    }

    let xOffset = startX;
    for (let w of columnWidths) {
      xOffset += w;
      pdf.line(xOffset, startY, xOffset, startY + headHeight + rowHeight * rowCount);
    }
  }

  // 插入發展領域名稱
  const addDomainName = (pdf, domainText, x, y) => {
    pdf.setFont("NotoSansTC-Bold", "bold");
    pdf.setFontSize(12);
    pdf.text(domainText, x, y, {
      align: "center",
      baseline: "middle"
    });
  }

  // 插入說明
  const addDescription = (pdf, wrappedText, x, y, maxWidth, rowHeight) => {
    pdf.setFont("NotoSansTC", "normal");
    pdf.setFontSize(12);
    let lineHeight = 6;
    let totalTextHeight = wrappedText.length * lineHeight;

    let centeredY = y + (rowHeight - totalTextHeight) / 2 + lineHeight / 2;

    wrappedText.forEach((line, index) => {
        pdf.text(line, x + maxWidth / 2, centeredY + index * lineHeight, {
            align: "center",
            baseline: "middle"
        });
    });
  }

  // 處理並插入照片
  const processImages = async (pdf, startX, startY, rowHeight, columnWidths) => {
    const rowCount = domains.value.length;

    for (let i = 0; i < rowCount; i++) {
      if (!domains.value[i] || !Array.isArray(domains.value[i].rotation)) {
        console.error("`domains.value[i]` 或 `rotation` 無效！", { domain: domains.value[i], imgIndex });
        return;
      }

      let yPos = startY + headHeight + i * rowHeight;
      let imgMaxWidth = (columnWidths[1] - 4) / 2;
      let imgMaxHeight = rowHeight - 6;

      let photoColumnCenterX = startX + columnWidths[0] + columnWidths[1] / 2;
      let imgXLeft = photoColumnCenterX - imgMaxWidth - 1;
      let imgXRight = photoColumnCenterX + 1;

      let images = domains.value[i]?.images || [];

      for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
        let img = images[imgIndex];
        if (!img) continue;
        let format = img.includes("image/png") ? "PNG" : "JPEG";

        let imageObj = new Image();
        imageObj.src = img;
        await new Promise((resolve) => {
          imageObj.onload = () => {
            let rotatedImage = getRotatedImage(imageObj, domains.value[i].rotation[imgIndex]);

            let imgWidth = imageObj.width || 100;
            let imgHeight = imageObj.height || 100;

            if (domains.value[i].rotation[imgIndex] === 90 || domains.value[i].rotation[imgIndex] === 270) {
              [imgWidth, imgHeight] = [imgHeight, imgWidth];
            }

            if (imgWidth > imgMaxWidth) {
              imgHeight *= imgMaxWidth / imgWidth;
              imgWidth = imgMaxWidth;
            }
            if (imgHeight > imgMaxHeight) {
              imgWidth *= imgMaxHeight / imgHeight;
              imgHeight = imgMaxHeight;
            }

            let imgY = yPos + (rowHeight - imgHeight) / 2;
            let imgX = imgIndex === 0 ? imgXLeft : imgXRight;

            pdf.addImage(rotatedImage, format, imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
            resolve();
          };
        });
      }
    }
  }

  const generatePDF = async () => {
    if (!domains.value || domains.value.length === 0) {
      console.error("domains 尚未初始化，無法產生 PDF");
      alert("請先上傳圖片，再產生 PDF！");
      return;
    }

    isGeneratingPDF.value = true;
    pdfGenerated.value = false;
    popupMessage.value = "產生PDF中，請稍待片刻...";

    await nextTick();

    const pdf = new jsPDF("p", "mm", "a4");

    const { fontRegular, fontBold } = await loadFonts();

    // 加入字體
    pdf.addFileToVFS("NotoSansTC-Regular.ttf", fontRegular);
    pdf.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
    pdf.addFileToVFS("NotoSansTC-Bold.ttf", fontBold);
    pdf.addFont("NotoSansTC-Bold.ttf", "NotoSansTC-Bold", "bold");

    drawHeader(pdf, unitName, month, className, recorder);
    drawTable(pdf, domains.value);

    const columnWidths = [35, 85, 70];
    await processImages(pdf, startX, startY, rowHeight, columnWidths);

    // 設定 PDF 檔名
    let filename = `發展領域記錄表-${month.value}-${className.value}-${recorder.value}.pdf`;
    pdf.save(filename);

    isGeneratingPDF.value = false;
    pdfGenerated.value = true;
    popupMessage.value = "PDF已完成，請自行下載。";

    unitName.value = "";
    month.value = "";
    recorder.value = "";
    className.value = "";
    domains.value.forEach(domain => {
      domain.images = [];
      domain.description = "";
      domain.rotation = [];
    });

    setTimeout(() => {
      pdfGenerated.value = false;
      popupMessage.value = "";
    }, 3000);
  };

  return {
    generatePDF,
  };
}