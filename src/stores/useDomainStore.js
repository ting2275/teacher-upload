import { defineStore } from "pinia";
import { ref } from "vue";

export const useDomainStore = defineStore("domainStore", {
  state: () => ({
    domains: ref([
      { name: "身體動作", images: [], description: "", rotation: [] },
      { name: "社會情緒", images: [], description: "", rotation: [] },
      { name: "語言溝通", images: [], description: "", rotation: [] },
      { name: "認知探索", images: [], description: "", rotation: [] },
      { name: "生活自理", images: [], description: "", rotation: [] },
      { name: "教玩具操作 / 文化藝術", images: [], description: "", rotation: [] }
    ])
  }),
  actions: {
    setDomains(newDomains) {
      this.domains.value = newDomains || [];
    },
    addImageToDomain(index, imageUrl) {
      if (this.domains.value[index]) {
        this.domains.value[index].images.push(imageUrl);
      }
    }
  }
});