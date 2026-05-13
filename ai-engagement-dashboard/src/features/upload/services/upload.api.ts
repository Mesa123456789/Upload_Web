// mockData is the actual export name in critique/data/mockData.ts
import { mockData as mockCritiqueData } from "../../critique/data/mockData";

export const submitDesign = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCritiqueData);
    }, 1000);
  });
};
