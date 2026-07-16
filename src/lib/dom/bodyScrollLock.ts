export function lockBodyScroll(): () => void {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const previousBodyOverflow = document.body.style.overflow;
  const previousBodyPaddingRight = document.body.style.paddingRight;
  const previousHtmlOverflow = document.documentElement.style.overflow;
  const previousHtmlPaddingRight = document.documentElement.style.paddingRight;

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  if (scrollbarWidth > 0) {
    const paddingRight = `${scrollbarWidth}px`;
    document.body.style.paddingRight = paddingRight;
    document.documentElement.style.paddingRight = paddingRight;
  }

  return () => {
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.documentElement.style.paddingRight = previousHtmlPaddingRight;
  };
}
