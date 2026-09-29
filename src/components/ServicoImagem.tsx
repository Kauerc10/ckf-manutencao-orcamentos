import { useEffect, useState } from 'react'
import { catalogoImageUrl } from '../lib/catalogo-images'
export function ServicoImagem({ path, nome }: { path: string; nome: string }) {
  const [image, setImage] = useState({ path: '', url: '' })
  useEffect(() => {
    let active = true
    void catalogoImageUrl(path).then((url) => {
      if (active) setImage({ path, url })
    })
    return () => {
      active = false
    }
  }, [path])
  if (image.path !== path || !image.url) return null
  return <img className="service-image" src={image.url} alt={nome} onError={() => setImage({ path, url: '' })} />
}
