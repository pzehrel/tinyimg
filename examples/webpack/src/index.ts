import bannerJpg from './assets/banner.jpg'
import logoPng from './assets/logo.png'
import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <h1>Tinyimg + Webpack</h1>
    <p>Build this project and check the console for compression stats.</p>
    <div class="images">
      <img src="${logoPng}" alt="Logo" />
      <img src="${bannerJpg}" alt="Banner" />
    </div>
  </div>
`
