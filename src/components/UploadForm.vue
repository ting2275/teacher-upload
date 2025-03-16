<template>
  <div class="container">
    <h1>六大發展領域記錄表</h1>

    <section class="card">
      <h2>Step 1: 填寫班級資料</h2>
      <div class="form-group">
        <label>單元名稱</label>
        <input type="text" v-model="unitName" maxlength="5" placeholder="輸入單元名稱">
        <div class="alert alert-info">最多只能輸入5個字</div>

        <label>年+月份</label>
        <input type="text" v-model="month" placeholder="輸入年+月份">
        <div class="alert alert-info">ex: 114年3月</div>

        <label>班級</label>
        <input type="text" v-model="className" placeholder="輸入班級">

        <label>記錄者</label>
        <input type="text" v-model="recorder" placeholder="輸入記錄者">
      </div>
    </section>

    <section class="card">
      <h2>Step 2: 上傳六大發展領域資料</h2>
      <div v-for="(domain, domainIndex) in domains" :key="domainIndex" class="domain-card">
        <h3>{{ domain.name }}</h3>
        <label class="file-label">
          <input type="file" accept="image/jpeg, image/png" @change="handleFileUpload($event, domainIndex)" multiple>
        </label>

        <div v-if="(domain.images || []).length" class="image-preview">
          <div v-for="(image, imgIndex) in domain.images || []" :key="imgIndex" class="image-container">
            <div class="image-wrapper">
              <img :src="image" alt="上傳圖片" width="200px" :style="{ transform: `rotate(${domain.rotation[imgIndex]}deg)` }">
            </div>
            <div class="image-actions">
              <button @click="rotateImage(domainIndex, imgIndex)" class="rotate-btn">
                <img src="@/assets/image-rotate.svg" alt="旋轉" width="26" height="26">
              </button>
              <button @click="removeImage(domainIndex, imgIndex)" class="delete-btn">
                <img src="@/assets/trash-can.svg" alt="刪除" width="30" height="30">
              </button>
            </div>
          </div>
        </div>
        <div class="alert alert-danger">最多只能上傳 2 張圖片</div>

        <textarea v-model="domain.description" @input="checkDescriptionLength(domain)" @blur="validateDescription(domain)" placeholder="請輸入發展領域說明" maxlength="80" rows="4"></textarea>

        <small v-if="domain.description.length >= 80" class="error">⚠️ 最多只能輸入 80 個字！</small>
      </div>
    </section>

    <!-- 遮蓋式彈出視窗 -->
    <div v-if="isGeneratingPDF || pdfGenerated" class="overlay">
      <div class="popup">
        <p>{{ popupMessage }}</p>
      </div>
    </div>
    <button class="pdf-button" @click="generatePDF">📄 產生 PDF</button>
  </div>
</template>

<script>
import { ref, watch, computed } from "vue";
import { useImageProcessor } from "@/composables/useImageProcessor";
import { usePDFGenerator } from "@/composables/usePDFGenerator";
import { useDomainStore } from "@/stores/useDomainStore";

export default {
  setup() {
    const unitName = ref(localStorage.getItem('unitName') || "");
    const month = ref(localStorage.getItem('month') || "");
    const recorder = ref(localStorage.getItem('recorder') || "");
    const className = ref(localStorage.getItem('className') || "");
    const domainStore = useDomainStore();
    const domains = computed(() => domainStore.domains);

    const isGeneratingPDF = ref(false);
    const pdfGenerated = ref(false);
    const popupMessage = ref("產生PDF中，請稍待片刻...");

    const { handleFileUpload, rotateImage, removeImage } = useImageProcessor();
    const { generatePDF } = usePDFGenerator(unitName, month, recorder, className, isGeneratingPDF, pdfGenerated, popupMessage);

    watch(unitName, (newVal) => {
      localStorage.setItem('unitName', newVal);
    });

    watch(month, (newVal) => {
      localStorage.setItem('month', newVal);
    });

    watch(recorder, (newVal) => {
      localStorage.setItem('recorder', newVal);
    });

    watch(className, (newVal) => {
      localStorage.setItem('className', newVal);
    });

    watch(domains, (newVal) => {
      localStorage.setItem('domains', JSON.stringify(newVal));
    }, { deep: true });

    const checkDescriptionLength = (domain) => {
      if (domain.description.length > 80) {
        alert("說明欄位最多 80 個字！");
        domain.description = domain.description.substring(0, 80);
      }
    };

    const validateDescription = (domain) => {
      if (!domain || !domain.description) return;

      if (domain.description.length > 80) {
        alert("說明欄位最多 80 個字！");
      }
    };

    return {
      unitName,
      month,
      recorder,
      className,
      domains,
      isGeneratingPDF,
      pdfGenerated,
      popupMessage,
      checkDescriptionLength,
      validateDescription,
      handleFileUpload,
      rotateImage,
      removeImage,
      generatePDF
    }
  }
};
</script>