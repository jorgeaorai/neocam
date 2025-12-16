"use client"

import { useRef, useState, useEffect } from "react"
import { RotateCw, Download, X, Zap, ZapOff, Sparkles } from "lucide-react"

type CapturedFile = {
  blob: Blob
  filename: string
  label: string
  url: string
}

export default function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [mode, setMode] = useState<"photo" | "video">("photo")
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [capturedFiles, setCapturedFiles] = useState<CapturedFile[]>([])
  const [showPopup, setShowPopup] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off")
  const [videoQuality, setVideoQuality] = useState<"HD" | "4K">("HD")
  const [frameRate, setFrameRate] = useState<30 | 60>(30)
  const [cinemaMode, setCinemaMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const initCamera = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }

        const resolution = videoQuality === "4K" ? 3840 : 1920

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: resolution },
            height: { ideal: resolution },
            aspectRatio: { ideal: 1 },
            facingMode: facingMode,
            frameRate: { ideal: frameRate },
          },
          audio: mode === "video",
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          const videoTrack = mediaStream.getVideoTracks()[0]
          const capabilities = videoTrack.getCapabilities() as any
          if (capabilities.zoom) {
            await videoTrack.applyConstraints({
              advanced: [{ zoom: zoom } as any],
            })
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
      }
    }

    initCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [mode, facingMode, videoQuality, frameRate])

  useEffect(() => {
    if (stream && videoRef.current) {
      const videoTrack = stream.getVideoTracks()[0]
      const capabilities = videoTrack.getCapabilities() as any
      if (capabilities.zoom) {
        videoTrack
          .applyConstraints({
            advanced: [{ zoom: zoom } as any],
          })
          .catch(() => {
            // Zoom not supported on this device
          })
      }
    }
  }, [zoom, stream])

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }

  const toggleFlash = () => {
    setFlashMode((prev) => {
      if (prev === "off") return "on"
      if (prev === "on") return "auto"
      return "off"
    })
  }

  useEffect(() => {
    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (cinemaMode) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        const horizontalSafeHeight = (1080 / 1920) * canvas.height
        const horizontalSafeY = (canvas.height - horizontalSafeHeight) / 2
        ctx.fillRect(0, 0, canvas.width, horizontalSafeY)
        ctx.fillRect(0, horizontalSafeY + horizontalSafeHeight, canvas.width, horizontalSafeY)
      }

      const horizontalSafeHeight = (1080 / 1920) * canvas.height
      const horizontalSafeY = (canvas.height - horizontalSafeHeight) / 2

      const verticalSafeWidth = (1080 / 1920) * canvas.width
      const verticalSafeX = (canvas.width - verticalSafeWidth) / 2

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
      ctx.lineWidth = 1
      ctx.strokeRect(0, horizontalSafeY, canvas.width, horizontalSafeHeight)

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
      ctx.lineWidth = 1
      ctx.strokeRect(verticalSafeX, 0, verticalSafeWidth, canvas.height)
    }

    const interval = setInterval(drawOverlay, 100)
    return () => clearInterval(interval)
  }, [cinemaMode])

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return
    setIsCapturing(true)

    if (flashMode === "on" || flashMode === "auto") {
      const flashDiv = document.createElement("div")
      flashDiv.className = "fixed inset-0 bg-white z-50 pointer-events-none"
      document.body.appendChild(flashDiv)
      setTimeout(() => flashDiv.remove(), 100)
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = 1920
    canvas.height = 1920

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, 1920, 1920)

    const files: CapturedFile[] = []

    await new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          files.push({
            blob,
            filename: "capture-square.png",
            label: "Quadrado (1920x1920)",
            url: URL.createObjectURL(blob),
          })
        }
        resolve()
      }, "image/png")
    })

    const horizontalCanvas = document.createElement("canvas")
    horizontalCanvas.width = 1920
    horizontalCanvas.height = 1080
    const hCtx = horizontalCanvas.getContext("2d")
    if (hCtx) {
      const cropY = (1920 - 1080) / 2
      hCtx.drawImage(canvas, 0, cropY, 1920, 1080, 0, 0, 1920, 1080)
      await new Promise<void>((resolve) => {
        horizontalCanvas.toBlob((blob) => {
          if (blob) {
            files.push({
              blob,
              filename: "capture-horizontal.png",
              label: "Horizontal (1920x1080)",
              url: URL.createObjectURL(blob),
            })
          }
          resolve()
        }, "image/png")
      })
    }

    const verticalCanvas = document.createElement("canvas")
    verticalCanvas.width = 1080
    verticalCanvas.height = 1920
    const vCtx = verticalCanvas.getContext("2d")
    if (vCtx) {
      const cropX = (1920 - 1080) / 2
      vCtx.drawImage(canvas, cropX, 0, 1080, 1920, 0, 0, 1080, 1920)
      await new Promise<void>((resolve) => {
        verticalCanvas.toBlob((blob) => {
          if (blob) {
            files.push({
              blob,
              filename: "capture-vertical.png",
              label: "Vertical (1080x1920)",
              url: URL.createObjectURL(blob),
            })
          }
          resolve()
        }, "image/png")
      })
    }

    setCapturedFiles(files)
    setShowPopup(true)
    setIsCapturing(false)
  }

  const startRecording = () => {
    if (!stream || !canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = 1920
    canvas.height = 1920

    const canvasStream = canvas.captureStream(frameRate)

    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      canvasStream.addTrack(audioTrack)
    }

    recordedChunksRef.current = []
    let mimeType = "video/webm;codecs=vp9"
    if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
      mimeType = "video/webm;codecs=h264"
    }

    const mediaRecorder = new MediaRecorder(canvasStream, { mimeType })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      processVideoRecording()
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setIsRecording(true)

    const drawFrame = () => {
      if (videoRef.current && canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 1920, 1920)

          if (cinemaMode) {
            ctx.fillStyle = "rgba(0, 0, 0, 1)"
            const barHeight = (1920 - 1080) / 2
            ctx.fillRect(0, 0, 1920, barHeight)
            ctx.fillRect(0, 1920 - barHeight, 1920, barHeight)
          }
        }
        if (isRecording) {
          requestAnimationFrame(drawFrame)
        }
      }
    }
    drawFrame()
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processVideoRecording = async () => {
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" })
    const files: CapturedFile[] = []

    files.push({
      blob,
      filename: "video-square.webm",
      label: "Quadrado (1920x1920)",
      url: URL.createObjectURL(blob),
    })

    const video = document.createElement("video")
    video.src = URL.createObjectURL(blob)
    video.muted = true

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.currentTime = 0
        resolve(null)
      }
    })

    await video.play()

    const horizontalBlob = await exportVideoCrop(video, 1920, 1080)
    if (horizontalBlob) {
      files.push({
        blob: horizontalBlob,
        filename: "video-horizontal.webm",
        label: "Horizontal (1920x1080)",
        url: URL.createObjectURL(horizontalBlob),
      })
    }

    const verticalBlob = await exportVideoCrop(video, 1080, 1920)
    if (verticalBlob) {
      files.push({
        blob: verticalBlob,
        filename: "video-vertical.webm",
        label: "Vertical (1080x1920)",
        url: URL.createObjectURL(verticalBlob),
      })
    }

    video.pause()
    URL.revokeObjectURL(video.src)

    setCapturedFiles(files)
    setShowPopup(true)
  }

  const exportVideoCrop = async (
    sourceVideo: HTMLVideoElement,
    width: number,
    height: number,
  ): Promise<Blob | null> => {
    return new Promise<Blob | null>((resolve) => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(null)
        return
      }

      const stream = canvas.captureStream(30)
      const audioTrack = sourceVideo.srcObject ? (sourceVideo.srcObject as MediaStream).getAudioTracks()[0] : null

      if (audioTrack) {
        stream.addTrack(audioTrack)
      }

      const chunks: Blob[] = []
      let mimeType = "video/webm;codecs=vp9"
      if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
        mimeType = "video/webm;codecs=h264"
      }

      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" })
        resolve(blob)
      }

      recorder.start()
      sourceVideo.currentTime = 0

      const drawCroppedFrame = () => {
        if (sourceVideo.paused || sourceVideo.ended) {
          recorder.stop()
          return
        }

        const sourceWidth = 1920
        const sourceHeight = 1920
        const cropX = width < sourceWidth ? (sourceWidth - width) / 2 : 0
        const cropY = height < sourceHeight ? (sourceHeight - height) / 2 : 0

        ctx.drawImage(sourceVideo, cropX, cropY, width, height, 0, 0, width, height)
        requestAnimationFrame(drawCroppedFrame)
      }

      drawCroppedFrame()
    })
  }

  const downloadFile = async (file: CapturedFile) => {
    const savedToRoll = await saveToRoll(file.blob, file.filename)

    if (!savedToRoll) {
      const a = document.createElement("a")
      a.href = file.url
      a.download = file.filename
      a.click()
    }
  }

  const saveToRoll = async (blob: Blob, filename: string) => {
    try {
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: blob.type })

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Salvar no Rolo da Câmera",
            text: "Salvar mídia capturada",
          })
          return true
        }
      }
    } catch (err) {
      console.log("Share API not available, falling back to download")
    }
    return false
  }

  const closePopup = () => {
    capturedFiles.forEach((file) => URL.revokeObjectURL(file.url))
    setCapturedFiles([])
    setShowPopup(false)
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="relative aspect-square w-full max-w-[min(100vw,100vh)] overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={overlayCanvasRef} width={1920} height={1920} className="absolute inset-0 h-full w-full" />

          <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-4">
            <button
              onClick={toggleFlash}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all hover:bg-black/60 active:scale-95"
              aria-label="Toggle flash"
            >
              {flashMode === "off" ? (
                <ZapOff className="h-5 w-5 text-white" />
              ) : flashMode === "on" ? (
                <Zap className="h-5 w-5 text-yellow-400" />
              ) : (
                <div className="relative">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-white">A</span>
                </div>
              )}
            </button>

            <div className="flex gap-2">
              {mode === "video" && (
                <button
                  onClick={() => setCinemaMode(!cinemaMode)}
                  disabled={isRecording}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-3 backdrop-blur-sm transition-all hover:bg-black/60 active:scale-95 disabled:opacity-50 ${
                    cinemaMode ? "bg-yellow-500/90" : "bg-black/40"
                  }`}
                  aria-label="Cinema mode"
                >
                  <Sparkles className={`h-4 w-4 ${cinemaMode ? "text-black" : "text-white"}`} />
                  <span className={`text-xs font-medium ${cinemaMode ? "text-black" : "text-white"}`}>CINEMA</span>
                </button>
              )}

              <button
                onClick={toggleCamera}
                disabled={isRecording || isCapturing}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all hover:bg-black/60 active:scale-95 disabled:opacity-50"
                aria-label="Switch camera"
              >
                <RotateCw className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-32 left-0 right-0 z-10 flex justify-center">
            <div className="flex gap-2 rounded-full bg-black/40 px-3 py-2 backdrop-blur-sm">
              {[0.5, 1, 2, 3].map((zoomLevel) => (
                <button
                  key={zoomLevel}
                  onClick={() => setZoom(zoomLevel)}
                  disabled={isRecording || isCapturing}
                  className={`px-3 py-1 text-sm font-medium transition-all disabled:opacity-50 ${
                    zoom === zoomLevel ? "text-yellow-400" : "text-white/70"
                  }`}
                >
                  {zoomLevel}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-8">
          <div className="mb-8">
            {mode === "photo" ? (
              <button
                onClick={capturePhoto}
                disabled={!stream || isCapturing}
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-all active:scale-90 disabled:opacity-50"
                aria-label="Take photo"
              >
                <div className="h-16 w-16 rounded-full bg-white" />
              </button>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!stream}
                className={`flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all active:scale-90 disabled:opacity-50 ${
                  isRecording ? "border-red-500" : "border-white"
                }`}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                <div
                  className={`transition-all ${
                    isRecording ? "h-8 w-8 rounded bg-red-500" : "h-16 w-16 rounded-full bg-red-500"
                  }`}
                />
              </button>
            )}
          </div>

          <div className="mb-4 flex items-center gap-1 rounded-full bg-black/40 px-4 py-2 backdrop-blur-sm">
            <button
              onClick={() => setMode("video")}
              disabled={isRecording}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${
                mode === "video" ? "text-yellow-400" : "text-white/70"
              }`}
            >
              VÍDEO
            </button>
            <button
              onClick={() => setMode("photo")}
              disabled={isRecording}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${
                mode === "photo" ? "text-yellow-400" : "text-white/70"
              }`}
            >
              FOTO
            </button>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            disabled={isRecording || isCapturing}
            className="text-xs text-white/60 transition-colors hover:text-white/80 disabled:opacity-50"
          >
            {showSettings ? "Ocultar" : "Configurações"}
          </button>

          {showSettings && (
            <div className="mt-3 w-80 rounded-2xl bg-black/60 p-4 backdrop-blur-md">
              <div className="space-y-4">
                {mode === "video" && (
                  <>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white/80">Qualidade</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVideoQuality("HD")}
                          disabled={isRecording}
                          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                            videoQuality === "HD" ? "bg-yellow-500 text-black" : "bg-white/10 text-white"
                          }`}
                        >
                          HD
                        </button>
                        <button
                          onClick={() => setVideoQuality("4K")}
                          disabled={isRecording}
                          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                            videoQuality === "4K" ? "bg-yellow-500 text-black" : "bg-white/10 text-white"
                          }`}
                        >
                          4K
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-white/80">Taxa de Quadros</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFrameRate(30)}
                          disabled={isRecording}
                          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                            frameRate === 30 ? "bg-yellow-500 text-black" : "bg-white/10 text-white"
                          }`}
                        >
                          30 FPS
                        </button>
                        <button
                          onClick={() => setFrameRate(60)}
                          disabled={isRecording}
                          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                            frameRate === 60 ? "bg-yellow-500 text-black" : "bg-white/10 text-white"
                          }`}
                        >
                          60 FPS
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-white/10 pt-2">
                  <p className="text-[10px] text-white/50">
                    {mode === "video" ? `Gravando em ${videoQuality} @ ${frameRate}fps` : "Modo Foto"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popup code */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-neutral-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Arquivos Capturados</h2>
              <button
                onClick={closePopup}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 transition-colors hover:bg-neutral-700"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {capturedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-xl bg-neutral-800 p-4 sm:flex-row sm:items-center"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-700 sm:w-32 sm:flex-shrink-0">
                    {file.filename.includes("video") ? (
                      <video
                        src={file.url}
                        className="h-full w-full object-cover"
                        controls={false}
                        muted
                        loop
                        autoPlay
                      />
                    ) : (
                      <img
                        src={file.url || "/placeholder.svg"}
                        alt={file.label}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-center text-sm text-neutral-300 sm:text-left">{file.label}</span>
                    <button
                      onClick={() => downloadFile(file)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:scale-95 sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Salvar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
