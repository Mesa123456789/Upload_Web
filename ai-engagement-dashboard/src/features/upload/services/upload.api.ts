import { mockData } from "../../critique/data/mockData"; // เปลี่ยนจาก mockCritiqueData เป็น mockData

export const submitDesign = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockData); // 
    }, 1000);
  });
};