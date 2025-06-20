export const pendingReasonMap = new Map();
export const activeOrderMap = new Map();
export const confirmationMap = new Map();

export const resetContext = () => {
  pendingReasonMap.clear();
  activeOrderMap.clear();
  confirmationMap.clear();
};
