import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { X, ChevronDown, ImagePlus, Upload, Loader2 } from "lucide-react"
import { useFeedback } from "@/components/feedback/FeedbackProvider"
import { useUpload } from "@/hooks/useUpload"
import { ImageGenerationForm, type ImageGenerationConfig } from "@/components/forms/ImageGenerationForm"
import type { CharacterCreateData, CharacterEditData, Character } from "@/types"

interface CharacterCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate?: (data: CharacterCreateData) => void
  onUpdate?: (data: CharacterEditData) => void
  initialData?: Character | null
  mode?: 'create' | 'edit'
}



const genderOptions = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
]

const ageOptions = [
  { value: "child", label: "儿童" },
  { value: "teen", label: "少年" },
  { value: "young", label: "青年" },
  { value: "middle", label: "中年" },
  { value: "old", label: "老年" },
]



export default function CharacterCreator({ 
  open, 
  onOpenChange, 
  onCreate, 
  onUpdate, 
  initialData, 
  mode = 'create' 
}: CharacterCreatorProps) {
  const { notify } = useFeedback()
  const isEditMode = mode === 'edit' && initialData != null
  const [genMethod, setGenMethod] = useState("model")
  const [selectedModel, setSelectedModel] = useState("")
  const [gender, setGender] = useState("")
  const [age, setAge] = useState("")
  const [characterName, setCharacterName] = useState("")
  const [description, setDescription] = useState("")
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [batchArchiveName, setBatchArchiveName] = useState("")

  const [isRealPerson, setIsRealPerson] = useState(true)

  // AI 生成配置（用于模型生成方式）
  const [generationConfig, setGenerationConfig] = useState<ImageGenerationConfig>({
    model: "",
    prompt: "",
    aspectRatio: "1:1",
    quantity: 1,
    referenceImages: [],
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)
  
  // 用于防止 useEffect 重复执行的 ref
  const initializedRef = useRef(false)
  const prevOpenRef = useRef(open)

  // 使用上传 hook
  const { uploading, progress, upload } = useUpload({
    directory: 'characters',
    onSuccess: (url) => {
      setReferenceImage(url)
      notify.success('图片上传成功')
    },
    onError: (error) => {
      notify.error(`上传失败: ${error.message}`)
    },
  })

  const generationMethods = [
    { id: "model", label: "通过模型生成角色" },
    { id: "upload", label: "自己上传图片" },
  ]

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 使用真实上传
    await upload(file)
    
    // 清空 input 以便可以重复选择同一文件
    e.target.value = ''
  }

  const handleGenMethodChange = (methodId: string) => {
    setGenMethod(methodId)
    if (methodId !== "upload") {
      setBatchArchiveName("")
    }
  }

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBatchArchiveName(file.name)
    }
  }

  useEffect(() => {
    // 只在 open 从 false 变为 true 时执行初始化
    const isOpening = open && !prevOpenRef.current
    prevOpenRef.current = open
    
    if (!open) {
      initializedRef.current = false
      return
    }
    
    if (!isOpening || initializedRef.current) return
    
    initializedRef.current = true
    if (isEditMode && initialData) {
      // 回填编辑数据
      setCharacterName(initialData.name)
      setGender(initialData.gender || "")
      setAge(initialData.ageGroup || "")

      setGenMethod(initialData.genMethod || "model")
      setSelectedModel(initialData.model || "xt45")
      setDescription(initialData.description || "")
      setReferenceImage(initialData.image || null)
      // 回填生成配置
      setGenerationConfig({
        model: initialData.model || "xt45",
        prompt: initialData.description || "",
        aspectRatio: "1:1",
        quantity: 1,
        referenceImages: initialData.image ? [initialData.image] : [],
      })
    } else {
      // 新建模式重置表单
      resetForm()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const resetForm = () => {
    setCharacterName("")
    setGender("")
    setAge("")
    setDescription("")
    setReferenceImage(null)
    setBatchArchiveName("")

    setGenMethod("model")
    setSelectedModel("")
    setIsRealPerson(true)
    setGenerationConfig({
      model: "",
      prompt: "",
      aspectRatio: "1:1",
      quantity: 1,
      referenceImages: [],
    })
  }

  const handleSubmit = () => {
    if (!characterName.trim()) {
      notify.warning("请输入角色名称")
      return
    }
    if (!gender) {
      notify.warning("请选择性别")
      return
    }
    if (!age) {
      notify.warning("请选择年龄段")
      return
    }
    if (genMethod === "upload" && !referenceImage && !batchArchiveName) {
      notify.warning("请上传已有角色图或 zip 压缩包")
      return
    }
    if (genMethod === "model" && !generationConfig.prompt.trim()) {
      notify.warning("请输入角色描述")
      return
    }
    
    // 根据生成方式选择数据来源
    const isModelGen = genMethod === "model"
    const finalModel = isModelGen ? generationConfig.model : selectedModel
    const finalDescription = isModelGen ? generationConfig.prompt : description
    const finalReferenceImage = isModelGen 
      ? generationConfig.referenceImages[0] || undefined 
      : referenceImage || undefined

    const finalQuantity = isModelGen ? generationConfig.quantity : 1

    if (isEditMode && initialData) {
      const updatedCharacter: CharacterEditData = {
        id: initialData.id,
        name: characterName,
        gender,
        ageGroup: age,
        genMethod,
        model: finalModel,
        description: finalDescription,
        referenceImage: finalReferenceImage,
        quantity: finalQuantity,
        isRealPerson,
        batchReferenceArchive: batchArchiveName || undefined,
      }
      onUpdate?.(updatedCharacter)
      notify.success("角色已更新")
    } else {
      const newCharacter: CharacterCreateData = {
        name: characterName,
        gender,
        ageGroup: age,
        genMethod,
        model: finalModel,
        description: finalDescription,
        referenceImage: finalReferenceImage,
        quantity: finalQuantity,
        isRealPerson,
        batchReferenceArchive: batchArchiveName || undefined,
      }
      onCreate?.(newCharacter)
      notify.success("角色创建成功")
    }
    
    resetForm()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[900px] sm:max-w-[900px] p-0 overflow-hidden bg-[hsl(var(--surface))]" style={{ maxWidth: '900px' }} hideCloseButton>
        <SheetTitle className="sr-only">创建角色</SheetTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--outline-variant))]/20 bg-[hsl(var(--surface))]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-[hsl(var(--on-surface))]">{isEditMode ? "编辑角色" : "新建角色"}</h2>
          </div>
          <Badge className="signature-gradient text-white border-0 px-4 py-1.5">
            角色生成任务列表
          </Badge>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-70px)] overflow-y-auto p-6 pb-28 space-y-6">
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

          {/* Row 1: Name / Gender / Age */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--on-surface))]">
                <span className="text-red-500 mr-1">*</span>角色名称
              </label>
              <Input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="请输入"
                className="h-11 rounded-xl bg-[hsl(var(--surface-container-low))] border-none text-sm placeholder:text-[hsl(var(--secondary))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary))]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--on-surface))]">
                <span className="text-red-500 mr-1">*</span>性别
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-11 justify-between rounded-xl bg-[hsl(var(--surface-container-low))] hover:bg-[hsl(var(--surface-container-high))] text-sm font-normal px-3"
                  >
                    <span className={gender ? "text-[hsl(var(--on-surface))]" : "text-[hsl(var(--secondary))]"}>
                      {gender ? genderOptions.find(g => g.value === gender)?.label : "请选择"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--secondary))]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {genderOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setGender(option.value)}>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--on-surface))]">
                <span className="text-red-500 mr-1">*</span>年龄段
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-11 justify-between rounded-xl bg-[hsl(var(--surface-container-low))] hover:bg-[hsl(var(--surface-container-high))] text-sm font-normal px-3"
                  >
                    <span className={age ? "text-[hsl(var(--on-surface))]" : "text-[hsl(var(--secondary))]"}>
                      {age ? ageOptions.find(a => a.value === age)?.label : "请选择"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--secondary))]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {ageOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setAge(option.value)}>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Generation Method */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[96px_minmax(0,1fr)] md:items-center">
            <label className="text-sm font-medium text-[hsl(var(--on-surface))] md:pt-1">
              <span className="text-red-500 mr-1">*</span>生成方式
            </label>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-[hsl(var(--outline-variant))]/30 bg-[hsl(var(--surface-container-low))] p-1.5">
              {generationMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleGenMethodChange(method.id)}
                  className={`rounded-xl px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all ${
                    genMethod === method.id
                      ? "signature-gradient text-white shadow-sm"
                      : "text-[hsl(var(--on-surface-variant))] hover:bg-[hsl(var(--surface-container-high))] hover:text-[hsl(var(--on-surface))]"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {genMethod === "upload" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-[hsl(var(--on-surface))]">
                  <span className="text-red-500 mr-1">*</span>是否真人
                </label>
                <div className="flex items-center gap-8">
                  {[
                    { label: "是", value: true },
                    { label: "否", value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setIsRealPerson(option.value)}
                      className="flex items-center gap-3 text-sm text-[hsl(var(--on-surface))]"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                          isRealPerson === option.value
                            ? "border-transparent signature-gradient"
                            : "border-[hsl(var(--outline-variant))]/40 bg-[hsl(var(--surface-container-low))]"
                        }`}
                      >
                        {isRealPerson === option.value && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--on-surface))]">上传已有角色图</label>
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`min-h-[220px] rounded-2xl border border-dashed border-[hsl(var(--outline-variant))]/40 bg-[hsl(var(--surface-container-low))] transition-colors hover:bg-[hsl(var(--surface-container-high))] cursor-pointer group overflow-hidden relative ${uploading ? 'pointer-events-none' : ''}`}
                  >
                    {uploading ? (
                      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3">
                        <Loader2 className="h-12 w-12 text-[hsl(var(--primary))] animate-spin" />
                        <div className="text-center space-y-1">
                          <p className="text-base font-medium text-[hsl(var(--on-surface))]">正在上传...</p>
                          <p className="text-sm text-[hsl(var(--secondary))]">{progress}%</p>
                        </div>
                      </div>
                    ) : referenceImage ? (
                      <>
                        <img src={referenceImage} alt="上传已有角色图" className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                          <span className="rounded-full bg-black/60 px-4 py-2 text-sm text-white">重新上传</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3">
                        <ImagePlus className="h-12 w-12 text-white/90" />
                        <div className="text-center space-y-1">
                          <p className="text-base font-medium text-[hsl(var(--on-surface))]">上传已有角色图</p>
                          <p className="text-sm text-[hsl(var(--secondary))]">支持 JPG / JPEG / PNG 格式</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--on-surface))]">批量上传已有角色图</label>
                  <div
                    onClick={() => batchFileInputRef.current?.click()}
                    className="min-h-[220px] rounded-2xl border border-dashed border-[hsl(var(--outline-variant))]/40 bg-[hsl(var(--surface-container-low))] transition-colors hover:bg-[hsl(var(--surface-container-high))] cursor-pointer group p-6"
                  >
                    <div className="flex h-full min-h-[172px] flex-col items-center justify-center gap-3 text-center">
                      <Upload className="h-12 w-12 text-white/90" />
                      <div className="space-y-1">
                        <p className="text-base font-medium text-[hsl(var(--on-surface))]">批量上传已有角色图</p>
                        <p className="text-sm text-[hsl(var(--secondary))]">支持上传 zip 格式的压缩包</p>
                      </div>
                      {batchArchiveName && (
                        <p className="max-w-full truncate rounded-full bg-[hsl(var(--surface-container-high))] px-3 py-1 text-xs text-[hsl(var(--on-surface))]">
                          {batchArchiveName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 模型生成方式 - 使用 ImageGenerationForm 组件 */}
          {genMethod === "model" && (
            <>
              {/* AI 生成表单组件 */}
              <ImageGenerationForm
                value={generationConfig}
                onChange={setGenerationConfig}
                quantityOptions={[1, 2, 3, 4, 5]}
              />
            </>
          )}

          {/* 自己上传图片 - 显示参考图上传 */}
          {genMethod === "upload" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--on-surface))]">角色参考图</label>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`min-h-[220px] rounded-2xl border border-dashed border-[hsl(var(--outline-variant))]/40 bg-[hsl(var(--surface-container-low))] transition-colors hover:bg-[hsl(var(--surface-container-high))] cursor-pointer group overflow-hidden relative ${uploading ? 'pointer-events-none' : ''}`}
              >
                {uploading ? (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3">
                    <Loader2 className="h-12 w-12 text-[hsl(var(--primary))] animate-spin" />
                    <div className="text-center space-y-1">
                      <p className="text-base font-medium text-[hsl(var(--on-surface))]">正在上传...</p>
                      <p className="text-sm text-[hsl(var(--secondary))]">{progress}%</p>
                    </div>
                  </div>
                ) : referenceImage ? (
                  <>
                    <img src={referenceImage} alt="角色参考图" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                      <span className="rounded-full bg-black/60 px-4 py-2 text-sm text-white">重新上传</span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--surface-container-high))]">
                      <ImagePlus className="h-8 w-8 text-[hsl(var(--secondary))] group-hover:text-[hsl(var(--primary))]" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-base font-medium text-[hsl(var(--on-surface))]">角色参考图</p>
                      <p className="text-sm text-[hsl(var(--secondary))]">支持 JPG / JPEG / PNG 格式</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[hsl(var(--surface))] to-transparent">
          <Button
            onClick={handleSubmit}
            className="w-full py-6 signature-gradient text-white rounded-xl font-bold text-lg border-0 hover:opacity-90 transition-opacity"
          >
            {isEditMode ? "保存修改" : "提交任务（消耗0积分）}"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
