import { nextTick, computed, ref } from "vue";
import { jsPDF } from "jspdf";
import { useDomainStore } from "@/stores/useDomainStore";

let cachedFonts = null;

// 字體檔轉成 base64 後存進 IndexedDB，下次造訪（甚至重新整理頁面）時
// 可直接讀取，不必再下載這個動輒 7MB 的 TTF 檔案。
const FONT_DB_NAME = 'teacher-upload-fonts';
const FONT_DB_VERSION = 1;
const FONT_STORE_NAME = 'fonts';
const FONT_CACHE_KEY_VERSION = 'v2'; // 字體檔內容變更時請更新此值以讓舊快取失效（v2: 改用常用字子集）

const openFontDB = () => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('indexedDB unavailable'));
    return;
  }
  const request = indexedDB.open(FONT_DB_NAME, FONT_DB_VERSION);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(FONT_STORE_NAME);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const idbGetFont = async (key) => {
  try {
    const db = await openFontDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FONT_STORE_NAME, 'readonly');
      const req = tx.objectStore(FONT_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

const idbSetFont = async (key, value) => {
  try {
    const db = await openFontDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FONT_STORE_NAME, 'readwrite');
      tx.objectStore(FONT_STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 儲存失敗（例如無痕模式或容量不足）不影響本次產生流程，略過即可
  }
};

export function usePDFGenerator(unitName, month, recorder, className) {
  const domainStore = useDomainStore();
  const domains = computed(() => domainStore.domains);
  const pdfStatus = ref('idle'); // 'idle' | 'generating' | 'success' | 'error'
  const errorMessage = ref('');
  const loadFont = async (filename) => {
    const dbKey = `${FONT_CACHE_KEY_VERSION}:${filename}`;

    const cached = await idbGetFont(dbKey);
    if (cached) return cached;

    const BASE_URL = import.meta.env.BASE_URL || "/";
    const url = `${BASE_URL}fonts/${filename}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load font: ${url}`);

    const fontData = await response.arrayBuffer();
    const bytes = new Uint8Array(fontData);
    const chunkSize = 0x8000;
    let binaryString = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binaryString += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }

    const base64 = btoa(binaryString);
    await idbSetFont(dbKey, base64);
    return base64;
  };

  const loadFonts = async () => {
    if (cachedFonts) return cachedFonts;

    const fontRegular = await loadFont("NotoSansTC-Regular.ttf");
    const fontBold = await loadFont("NotoSansTC-Bold.ttf");

    if (!fontRegular || !fontBold) {
      throw new Error("字體載入失敗，字體資料為空");
    }

    cachedFonts = { fontRegular, fontBold };
    return cachedFonts;
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
    pdf.text(`年月: ${month.value}`, 70, headerStartY + 15);
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

    pdfStatus.value = 'generating';
    errorMessage.value = '';

    await nextTick();

    try {
      const pdf = new jsPDF("p", "mm", "a4");

      const { fontRegular, fontBold } = await loadFonts();

      pdf.addFileToVFS("NotoSansTC-Regular.ttf", fontRegular);
      pdf.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
      pdf.addFileToVFS("NotoSansTC-Bold.ttf", fontBold);
      pdf.addFont("NotoSansTC-Bold.ttf", "NotoSansTC-Bold", "bold");

      drawHeader(pdf, unitName, month, className, recorder);
      drawTable(pdf);

      const columnWidths = [35, 85, 70];
      await processImages(pdf, startX, startY, rowHeight, columnWidths);

      let filename = `發展領域記錄表-${month.value}-${className.value}-${recorder.value}.pdf`;
      pdf.save(filename);

      pdfStatus.value = 'success';
    } catch (e) {
      errorMessage.value = e.message || '生成失敗，請再試一次';
      pdfStatus.value = 'error';
    }
  };

  const clearForm = () => {
    unitName.value = '';
    month.value = '';
    recorder.value = '';
    className.value = '';
    domains.value.forEach(domain => {
      domain.images = [];
      domain.description = '';
      domain.rotation = [];
    });
    pdfStatus.value = 'idle';
  };

  const dismissError = () => {
    pdfStatus.value = 'idle';
    errorMessage.value = '';
  };

  return {
    generatePDF,
    pdfStatus,
    errorMessage,
    clearForm,
    dismissError,
  };
}