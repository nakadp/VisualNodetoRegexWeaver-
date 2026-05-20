import regexgen from 'regexgen';

export const evolveRegex = (inputs: string[]): string => {
  if (!inputs || inputs.length === 0) return '';
  try {
    const re = regexgen(inputs);
    return re.toString();
  } catch (e) {
    console.error('Darwin Magic failed:', e);
    return '';
  }
};
