// Lokal erstellte Tontoos – nur im Speicher, kein Backend.
// (Geht beim Neuladen verloren, wie der restliche Demo-State.)
const customs = []

export const getCustomTontoos = () => customs

export const addCustomTontoo = (t) => {
  if (!customs.some((x) => x.id === t.id)) customs.push(t)
  return t
}
