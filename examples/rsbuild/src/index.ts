import bannerJpg from './assets/banner.jpg'
import logoPng from './assets/logo.png'
import './index.css'

document.querySelector<HTMLDivElement>('#root')!.innerHTML = `
  <div class="container">
    <h1>Tinyimg + Rsbuild</h1>
    <p>Build this project and check the console for compression stats.</p>
    <div class="images">
      <img src="${logoPng}" alt="Logo" />
      <img src="${bannerJpg}" alt="Banner" />
    </div>
  </div>
`
