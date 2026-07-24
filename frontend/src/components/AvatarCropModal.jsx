import { useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, cropPixels) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height,
  )
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92))
}

/*
 * Modal chọn + căn chỉnh ảnh đại diện (kéo-thả / copy-dán / chọn file), crop vuông kiểu avatar Facebook.
 * Cha chịu trách nhiệm mount/unmount component này (mount khi mở, unmount khi đóng) để state luôn sạch mỗi lần mở.
 * onSave nhận vào 1 Blob ảnh đã crop, chịu trách nhiệm upload.
 */
export default function AvatarCropModal({ onClose, onSave, title = 'Cập nhật ảnh đại diện' }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const loadFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) { setError('File phải là ảnh'); return }
    setError('')
    const dataUrl = await readFileAsDataUrl(file)
    setImageSrc(dataUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  // Cho phép dán ảnh từ clipboard (Ctrl+V) khi modal đang mở
  useEffect(() => {
    const handlePaste = (e) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (file) loadFile(file)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setSaving(true)
    setError('')
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      await onSave(blob)
      onClose()
    } catch {
      setError('Lỗi khi lưu ảnh')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{title}</h2>
        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}

        {!imageSrc ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]) }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`, borderRadius: 12, padding: 40,
              textAlign: 'center', cursor: 'pointer', background: dragOver ? '#eff6ff' : '#f8fafc',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🖼️</div>
            <div style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>Kéo &amp; thả ảnh vào đây, dán (Ctrl+V), hoặc bấm để chọn</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Hỗ trợ dán ảnh trực tiếp từ clipboard</div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => loadFile(e.target.files?.[0])} />
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: '100%', height: 320, background: '#111', borderRadius: 12, overflow: 'hidden' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Thu phóng</span>
              <input type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
            </div>
            <button type="button" onClick={() => setImageSrc(null)}
              style={{ marginTop: 8, background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              Chọn ảnh khác
            </button>
          </>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
          <button type="button" onClick={handleSave} disabled={!imageSrc || saving}
            style={{
              flex: 2, background: (!imageSrc || saving) ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none',
              padding: '11px', borderRadius: 8, fontWeight: 700, cursor: (!imageSrc || saving) ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Đang lưu...' : 'Lưu ảnh'}
          </button>
        </div>
      </div>
    </div>
  )
}
