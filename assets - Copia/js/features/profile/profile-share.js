window.DokeProfileShare = {
  bind(buttons, getShareData) {
    buttons.forEach((button) => {
      button.addEventListener('click', async () => {
        const shareData = typeof getShareData === 'function' ? getShareData() : null;
        if (!shareData) return;
        try {
          if (navigator.share) {
            await navigator.share(shareData);
            return;
          }
          await navigator.clipboard.writeText(shareData.url || window.location.href);
          button.blur();
        } catch (error) {
          console.warn('Falha ao compartilhar perfil.', error);
        }
      });
    });
  }
};
