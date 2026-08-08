const coreButtons = document.querySelectorAll(".core-card[data-screen]");
const menuButtons = document.querySelectorAll(".menu-item[data-screen]");
function moveToScreen(key) {
  const safeKey = encodeURIComponent(key);
  window.location.href = `screen.html?screen=${safeKey}`;
}

coreButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-screen");
    moveToScreen(target);
  });
});

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-screen");
    moveToScreen(target);
  });
});
