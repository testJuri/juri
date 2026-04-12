import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  X,
  HelpCircle,
  ImagePlus,
  Upload,
  ChevronDown,
  Check,
  Loader2
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useFeedback } from "@/components/feedback/FeedbackProvider"
import { useImageModels } from "@/features/infinite-canvas/hooks"
import { useUpload } from "@/hooks/useUpload"
import type { Scene } from "@/types"

export interface SceneCreateData {
  name: string
  genMethod: string
  model: string
  description: string
  distance: number
  zoom: number
  status: "draft" | "in-use"
}

export interface SceneEditData extends SceneCreateData {
  id: number
}

interface SceneCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate?: (data: SceneCreateData) => void
  onUpdate?: (data: SceneEditData) => void
  initialData?: Scene | null
  mode?: 'create' | 'edit'
}

export default function SceneCreator({ 
  open, 
  onOpenChange, 
  onCreate, 
  onUpdate, 
  initialData, 
  mode = 'create' 
}: SceneCreatorProps) {
  const { notify } = useFeedback()
  const isEditMode = mode === 'edit' && initialData != null
  // 从全局缓存获取图片模型列表（图像生成模型）
  const { models: imageModels, loading: modelsLoading, error: modelsError, refetch } = useImageModels()
  const [selectedModel, setSelectedModel] = useState<string>("")
  
  // 当模型列表加载完成时，默认选中第一个（只在初始加载时执行一次）
  useEffect(() => {
    if (imageModels.length > 0 && !selectedModel && !initializedRef.current) {
      setSelectedModel(imageModels[0].id)
    }
  }, [imageModels])
  const [genMethod, setGenMethod] = useState("model")

  const [distance, setDistance] = useState([8.0])
  const [zoom, setZoom] = useState(0.6)
  const [sceneName, setSceneName] = useState("")
  const [description, setDescription] = useState("")
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [batchArchiveName, setBatchArchiveName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)
  
  // 用于防止 useEffect 重复执行的 ref
  const initializedRef = useRef(false)
  const prevOpenRef = useRef(open)

  // 使用上传 hook
  const { uploading, progress, upload } = useUpload({
    directory: 'scenes',
    onSuccess: (url) => {
      setReferenceImage(url)
      notify.success('图片上传成功')
    },
    onError: (error) => {
      notify.error(`上传失败: ${error.message}`)
    },
  })

  // 重置表单的函数
  const resetForm = () => {
    setSceneName("")
    setDescription("")
    setReferenceImage(null)
    setBatchArchiveName("")
    setSelectedModel(imageModels[0]?.id ?? "")
    setGenMethod("model")
    setDistance([8.0])
    setZoom(0.6)
  }

  // 编辑模式下回填数据 / 关闭时重置表单
  useEffect(() => {
    // 只在 open 从 false 变为 true 时执行初始化
    const isOpening = open && !prevOpenRef.current
    prevOpenRef.current = open
    
    if (!open) {
      initializedRef.current = false
      return
    }
    
    // 只在打开时执行一次
    if (!isOpening || initializedRef.current) return
    
    initializedRef.current = true
    
    if (isEditMode && initialData) {
      setSceneName(initialData.name)
      setGenMethod(initialData.genMethod || "model")
      setSelectedModel(initialData.model || imageModels[0]?.id || "")
      setDescription(initialData.description || "")
      // 其他字段根据实际情况回填
    } else {
      // 新建模式重置表单
      resetForm()
    }
  }, [open])

  const generationMethods = [
    { id: "model", label: "通过模型生成场景" },
    { id: "upload", label: "自己上传图片" },
  ]

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 使用真实上传
    await upload(file)
    setBatchArchiveName("")
    
    // 清空 input 以便可以重复选择同一文件
    e.target.value = ''
  }

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBatchArchiveName(file.name)
      setReferenceImage(null)
    }
  }

  const handleSubmit = () => {
    if (!sceneName.trim()) {
      notify.warning("请输入场景名称")
      return
    }

    if (genMethod === "upload" && !referenceImage && !batchArchiveName) {
      notify.warning("请先上传场景图或批量压缩包")
      return
    }
    
    if (isEditMode && initialData) {
      const updatedScene: SceneEditData = {
        id: initialData.id,
        name: sceneName,
        genMethod,
        model: selectedModel,
        description,
        distance: distance[0],
        zoom,
        status: initialData.status === "in-use" ? "in-use" : "draft"
      }
      onUpdate?.(updatedScene)
      notify.success("场景已更新")
    } else {
      const newScene: SceneCreateData = {
        name: sceneName,
        genMethod,
        model: selectedModel,
        description,
        distance: distance[0],
        zoom,
        status: "draft"
      }
      onCreate?.(newScene)
      notify.success("场景创建成功")
    }
    
    // Reset form
    resetForm()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[900px] sm:max-w-[900px] p-0 overflow-hidden bg-[hsl(var(--surface))]" style={{ maxWidth: '900px' }} hideCloseButton>
        {/* 隐藏的标题用于无障碍访问 */}
        <SheetTitle className="sr-only">创建场景</SheetTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--outline-variant))]/20 bg-[hsl(var(--surface))]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-[hsl(var(--on-surface))]">{isEditMode ? "编辑场景" : "创建场景"}</h2>
          </div>
          <Badge className="signature-gradient text-white border-0 px-4 py-1.5">
            场景生成任务列表
          </Badge>
        </div>

        <div className="flex h-[calc(100vh-70px)]">
          {/* Left Panel - Form */}
          <div className="flex h-full w-full flex-col space-y-6 overflow-y-auto p-6 pb-24">
            {/* Scene Name */}
            <div className="space-y-2">
              <Input 
                placeholder="请输入场景名称"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                className="bg-[hsl(var(--surface-container-low))] border-none rounded-xl h-12 text-lg"
              />
            </div>

            {/* Generation Method */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-1">
                <span className="text-red-500">*</span> 生成方式
              </label>
              <div className="flex flex-wrap gap-2 rounded-2xl bg-[hsl(var(--surface-container-low))] p-1.5">
                {generationMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setGenMethod(method.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      genMethod === method.id
                        ? "signature-gradient text-white shadow-sm"
                        : "text-[hsl(var(--on-surface))] hover:bg-[hsl(var(--surface-container-high))]"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {genMethod === "upload" ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={batchFileInputRef}
                  onChange={handleBatchUpload}
                  accept=".zip,application/zip"
                  className="hidden"
                />
                <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[hsl(var(--on-surface))]">上传已有场景图</label>
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`min-h-[260px] cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--outline-variant))]/40 bg-[hsl(var(--surface-container-low))] transition-colors hover:bg-[hsl(var(--surface-container-high))] group relative ${uploading ? 'pointer-events-none' : ''}`}
                    >
                      {uploading ? (
                        <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-center">
                          <Loader2 className="h-14 w-14 text-[hsl(var(--primary))] animate-spin" />
                          <div className="space-y-1">
                            <p className="text-xl font-medium text-[hsl(var(--on-surface))]">正在上传...</p>
                            <p className="text-sm text-[hsl(var(--secondary))]">{progress}%</p>
                          </div>
                        </div>
                      ) : referenceImage ? (
                        <>
                          <img src={referenceImage} alt="上传已有场景图" className="absolute inset-0 h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="rounded-full bg-black/60 px-4 py-2 text-sm text-white">重新上传</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-center">
                          <ImagePlus className="h-14 w-14 text-[hsl(var(--on-surface))]" />
                          <div className="space-y-1">
                            <p className="text-xl font-medium text-[hsl(var(--on-surface))]">上传已有场景图</p>
                            <p className="text-sm text-[hsl(var(--secondary))]">支持 JPG / JPEG / PNG 格式</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[hsl(var(--on-surface))]">批量上传已有场景图</label>
                    <div
                      onClick={() => batchFileInputRef.current?.click()}
                      className="min-h-[260px] cursor-pointer rounded-2xl border border-dashed border-[hsl(var(--outline-variant))]/40 bg-[hsl(var(--surface-container-low))] p-6 transition-colors hover:bg-[hsl(var(--surface-container-high))]"
                    >
                      <div className="flex h-full min-h-[212px] flex-col items-center justify-center gap-4 text-center">
                        <Upload className="h-14 w-14 text-[hsl(var(--on-surface))]" />
                        <div className="space-y-1">
                          <p className="text-xl font-medium text-[hsl(var(--on-surface))]">批量上传已有场景图</p>
                          <p className="text-sm text-[hsl(var(--secondary))]">支持上传 zip 格式的压缩包</p>
                        </div>
                        {batchArchiveName ? (
                          <p className="max-w-full truncate rounded-full bg-[hsl(var(--surface-container-high))] px-3 py-1 text-xs text-[hsl(var(--on-surface))]">
                            {batchArchiveName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
            <>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[hsl(var(--on-surface))]">
                    <span className="text-red-500 mr-1">*</span>选择模型
                  </label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-12 w-full justify-between rounded-xl bg-[hsl(var(--surface-container-low))] px-4 text-left text-sm font-normal text-[hsl(var(--on-surface))] hover:bg-[hsl(var(--surface-container-high))]"
                      >
                        <span>
                          {modelsLoading 
                            ? "加载中..." 
                            : (imageModels.find((model) => model.id === selectedModel)?.name ?? "选择场景模型")
                          }
                        </span>
                        <ChevronDown className="h-4 w-4 text-[hsl(var(--secondary))]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={10}
                      className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border-[hsl(var(--outline-variant))]/30 bg-[hsl(var(--surface-container-lowest))] p-2 shadow-xl"
                    >
                      {modelsLoading ? (
                        <DropdownMenuItem disabled className="text-[hsl(var(--secondary))]">
                          加载模型列表...
                        </DropdownMenuItem>
                      ) : modelsError ? (
                        <DropdownMenuItem 
                          onClick={() => refetch()} 
                          className="text-red-500 cursor-pointer"
                        >
                          加载失败: {modelsError} (点击重试)
                        </DropdownMenuItem>
                      ) : imageModels.length === 0 ? (
                        <DropdownMenuItem disabled className="text-[hsl(var(--secondary))]">
                          暂无可用模型
                        </DropdownMenuItem>
                      ) : (
                        imageModels.map((model) => (
                          <DropdownMenuItem
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`min-h-[44px] rounded-lg px-3 text-base ${
                              selectedModel === model.id
                                ? "bg-[hsl(var(--primary))] text-white focus:bg-[hsl(var(--primary))] focus:text-white"
                                : "text-[hsl(var(--on-surface))]"
                            }`}
                          >
                            <Check
                              className={`mr-3 h-4 w-4 ${
                                selectedModel === model.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span>{model.name}</span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <p className="text-xs text-[hsl(var(--secondary))]">
                    {imageModels.find((model) => model.id === selectedModel)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1 text-[hsl(var(--on-surface))]">
                    <span className="text-red-500">*</span> 提示词
                    <HelpCircle className="w-4 h-4 text-[hsl(var(--secondary))]" />
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="rounded-2xl border border-[hsl(var(--outline-variant))]/35 bg-[hsl(var(--surface-container-low))] p-4">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[hsl(var(--outline-variant))]/45 bg-[hsl(var(--surface-container-lowest))] text-[hsl(var(--secondary))] transition-all hover:border-[hsl(var(--primary))]/45 hover:text-[hsl(var(--primary))] disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="h-7 w-7 animate-spin" />
                        ) : referenceImage ? (
                          <img src={referenceImage} alt="场景参考图" className="h-full w-full object-cover" />
                        ) : (
                          <ImagePlus className="h-7 w-7" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={uploading ? `正在上传... ${progress}%` : "上传参考图、输入文字，描述你想生成的场景，包括空间构成、时间氛围、光线、材质、镜头语言等。"}
                          disabled={uploading}
                          className="min-h-[110px] w-full resize-none bg-transparent text-base text-[hsl(var(--on-surface))] placeholder:text-[hsl(var(--secondary))] focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[hsl(var(--secondary))]">
                    参考图可帮助场景在构图、氛围和材质上更贴近目标方向。
                  </p>
                </div>
              </div>
            </>
            )}


          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[hsl(var(--surface))] to-transparent">
          <Button 
            onClick={handleSubmit}
            className="w-full py-6 signature-gradient text-white rounded-xl font-bold text-lg border-0"
          >
            {isEditMode ? "保存修改" : "提交任务（消耗2积分）"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
