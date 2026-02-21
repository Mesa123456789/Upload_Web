import { mockCritiqueData } from "../../critique/data/mockData";

export const submitDesign = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCritiqueData);
    }, 1000);
  });
};
