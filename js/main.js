// Pavel Šrámek — osobní web — sdílené chování napříč stránkami

document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("nav-open");
    });
  }

  // Contact form: friendly inline confirmation (Netlify handles the actual submission)
  const form = document.querySelector("#contact-form");
  const confirmBox = document.querySelector("#form-confirm");
  if (form && confirmBox) {
    form.addEventListener("submit", () => {
      // Let Netlify process the POST natively; just show a local confirmation
      // for users who stay on page (Netlify will redirect on success by default
      // unless a data-netlify-success action/redirect is configured).
      window.setTimeout(() => confirmBox.classList.add("show"), 50);
    });
  }
});
