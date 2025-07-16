import { ConversationContext } from "@tsdaodao/base";
import React from "react";
import { Component, ReactNode } from "react";
import { FileContent } from "../../Messages/File";
import WKApp from "../../App";
import APIClient from "../../Service/APIClient";
import { Toast } from "@douyinfe/semi-ui";

import "./index.css"

interface FileToolbarProps {
    conversationContext: ConversationContext
    icon: string
}

interface FileToolbarState {
    showDialog: boolean
    file?: File
}

export default class FileToolbar extends Component<FileToolbarProps, FileToolbarState> {
    constructor(props: any) {
        super(props)
        this.state = {
            showDialog: false,
        }
    }

    componentDidMount() {
        const { conversationContext } = this.props

        // 设置拖拽文件回调
        conversationContext.setDragFileCallback((file) => {
            if (!this.isImageFile(file)) {
                this.showFile(file)
            }
        })
    }

    $fileInput: any

    onFileClick = (event: any) => {
        event.target.value = '' // 防止选中一个文件取消后不能再选中同一个文件
    }

    onFileChange() {
        let file = this.$fileInput.files[0];
        if (file) {
            this.showFile(file);
        }
    }

    chooseFile = () => {
        this.$fileInput.click();
    }

    isImageFile(file: File): boolean {
        return !!(file.type && file.type.startsWith('image/'))
    }

    showFile(file: File) {
        // 检查文件大小（限制100MB）
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            Toast.error("文件大小不能超过100MB");
            return;
        }

        this.setState({
            file: file,
            showDialog: true,
        });
    }

    onSend() {
        const { conversationContext } = this.props
        const { file } = this.state

        if (!file) return

        // 创建文件内容并直接发送消息，让SDK自动处理文件上传
        const fileContent = new FileContent(file)
        conversationContext.sendMessage(fileContent)
        
        this.setState({
            showDialog: false,
        })
    }

    render(): ReactNode {
        const { icon } = this.props
        const { showDialog, file } = this.state

        return (
            <div className="wk-filetoolbar">
                <div className="wk-filetoolbar-content" onClick={this.chooseFile}>
                    <div className="wk-filetoolbar-content-icon">
                        <img src={icon} alt="上传文件" />
                        <input 
                            onClick={this.onFileClick} 
                            onChange={this.onFileChange.bind(this)} 
                            ref={(ref) => { this.$fileInput = ref }} 
                            type="file" 
                            multiple={false} 
                            style={{ display: 'none' }} 
                        />
                    </div>
                </div>
                {showDialog && (
                    <FileDialog 
                        file={file}
                        uploading={false}
                        onSend={this.onSend.bind(this)} 
                        onClose={() => {
                            this.setState({ showDialog: false })
                        }} 
                    />
                )}
            </div>
        )
    }
}

interface FileDialogProps {
    onClose: () => void
    onSend?: () => void
    file?: File
    uploading: boolean
}

class FileDialog extends Component<FileDialogProps> {
    formatFileSize(size: number): string {
        if (size < 1024) return `${size} B`
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
        if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }

    getFileIcon(filename: string): string {
        const extension = filename.split('.').pop()?.toLowerCase() || ''
        const iconMap: { [key: string]: string } = {
            'pdf': require('./icons/pdf.png'),
            'doc': require('./icons/doc.png'),
            'docx': require('./icons/doc.png'),
            'xls': require('./icons/excel.png'),
            'xlsx': require('./icons/excel.png'),
            'ppt': require('./icons/ppt.png'),
            'pptx': require('./icons/ppt.png'),
            'txt': require('./icons/txt.png'),
            'zip': require('./icons/zip.png'),
            'rar': require('./icons/zip.png'),
            '7z': require('./icons/zip.png'),
            'mp4': require('./icons/video.png'),
            'avi': require('./icons/video.png'),
            'mov': require('./icons/video.png'),
            'mp3': require('./icons/audio.png'),
            'wav': require('./icons/audio.png'),
            'flac': require('./icons/audio.png'),
        }
        return iconMap[extension] || require('./icons/file.png')
    }

    render() {
        const { onClose, onSend, file, uploading } = this.props

        return (
            <div className="wk-filedialog">
                <div className="wk-filedialog-mask" onClick={onClose}></div>
                <div className="wk-filedialog-content">
                    <div className="wk-filedialog-content-close" onClick={onClose}>
                        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                            <path d="M568.92178541 508.23169412l299.36805789-299.42461715a39.13899415 39.13899415 0 0 0 0-55.1452591L866.64962537 152.02159989a39.13899415 39.13899415 0 0 0-55.08869988 0L512.19286756 451.84213173 212.76825042 151.90848141a39.13899415 39.13899415 0 0 0-55.0886999 0L155.98277331 153.54869938a38.46028327 38.46028327 0 0 0 0 55.08869987L455.46394971 508.23169412 156.03933259 807.71287052a39.13899415 39.13899415 0 0 0 0 55.08869986l1.64021795 1.6967772a39.13899415 39.13899415 0 0 0 55.08869988 0l299.42461714-299.48117638 299.36805793 299.42461714a39.13899415 39.13899415 0 0 0 55.08869984 0l1.6967772-1.64021796a39.13899415 39.13899415 0 0 0 0-55.08869987L568.86522614 508.17513487z"></path>
                        </svg>
                    </div>
                    <div className="wk-filedialog-content-title">发送文件</div>
                    <div className="wk-filedialog-content-body">
                        <div className="wk-filedialog-content-preview">
                            <div className="wk-filedialog-content-preview-file">
                                <div className="wk-filedialog-content-preview-file-icon">
                                    <img src={this.getFileIcon(file?.name || '')} alt="file" />
                                </div>
                                <div className="wk-filedialog-content-preview-filecontent">
                                    <div className="wk-filedialog-content-preview-filecontent-name">{file?.name}</div>
                                    <div className="wk-filedialog-content-preview-filecontent-size">{this.formatFileSize(file?.size || 0)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="wk-filedialog-footer">
                            <button onClick={onClose} disabled={uploading}>取消</button>
                            <button 
                                onClick={onSend} 
                                className="wk-filedialog-footer-okbtn" 
                                disabled={uploading}
                                style={{ backgroundColor: uploading ? 'gray' : WKApp.config.themeColor }}
                            >
                                {uploading ? '上传中...' : '发送'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
} 