/**
 * File Widget Component
 * Handles file input, drag & drop, and file processing
 */

import React, { useRef, useCallback, useState, useMemo } from 'react';

const DEFAULT_ACCEPTED_TYPES = [
    '.mid',
    '.midi',
    '.MID',
    '.MIDI',
    'audio/midi',
    'audio/x-midi',
    'audio/mid',
    'application/x-midi',
    'application/octet-stream'
];

const normalizeAcceptList = (acceptList = []) => {
    return acceptList
        .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
};

const buildAcceptAttribute = (acceptList = []) => {
    // Deduplicate while preserving order
    const seen = new Set();
    const deduped = [];
    acceptList.forEach(value => {
        const key = value.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(value);
        }
    });
    return deduped.join(',');
};

export const FileWidget = ({ 
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    multiple = false,
    dragAndDrop = true,
    onFileSelect = () => {},
    onFileLoad = () => {},
    onError = (error) => console.error(error),
    onProgress = () => {}
}) => {
    const [dragOver, setDragOver] = useState(false);
    const [fileInfo, setFileInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const normalizedAccepted = useMemo(() => normalizeAcceptList(acceptedTypes), [acceptedTypes]);
    const acceptAttribute = useMemo(() => buildAcceptAttribute(normalizedAccepted), [normalizedAccepted]);

    const validateFile = useCallback((file) => {
        // Check file size
        if (file.size > maxFileSize) {
            onError(`File too large: ${file.name} (${formatFileSize(file.size)})`);
            return false;
        }

        // Check file type
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        const mimeType = (file.type || '').toLowerCase();

        const isExtensionAllowed = normalizedAccepted.some(type => type.startsWith('.') && type.toLowerCase() === extension);
        const isMimeAllowed = normalizedAccepted.some(type => !type.startsWith('.') && type.toLowerCase() === mimeType);

        if (!isExtensionAllowed && !isMimeAllowed) {
            onError(`Invalid file type: ${file.name}`);
            return false;
        }

        return true;
    }, [normalizedAccepted, maxFileSize, onError]);

    const loadFile = useCallback((file) => {
        const reader = new FileReader();
        
        setIsLoading(true);
        
        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target.result;
                const fileData = {
                    file: file,
                    data: arrayBuffer,
                    name: file.name,
                    size: file.size
                };
                
                setFileInfo({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                });
                
                onFileLoad(fileData);
            } catch (error) {
                onError(`Error reading file: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        reader.onerror = () => {
            onError(`Error reading file: ${file.name}`);
            setIsLoading(false);
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress, file);
            }
        };

        reader.readAsArrayBuffer(file);
    }, [onFileLoad, onError, onProgress]);

    const processFiles = useCallback((files) => {
        if (files.length === 0) return;

        // Filter valid files
        const validFiles = files.filter(validateFile);
        
        if (validFiles.length === 0) {
            onError('No valid MIDI files selected');
            return;
        }

        // Process files
        validFiles.forEach(loadFile);
        onFileSelect(validFiles);
    }, [validateFile, loadFile, onFileSelect, onError]);

    const handleFileSelect = useCallback((event) => {
        const files = Array.from(event.target.files);
        processFiles(files);
    }, [processFiles]);

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragEnter = useCallback((event) => {
        event.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragOver(false);
        }
    }, []);

    const handleDrop = useCallback((event) => {
        event.preventDefault();
        setDragOver(false);

        const files = Array.from(event.dataTransfer.files);
        processFiles(files);
    }, [processFiles]);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="file-widget">
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttribute}
                multiple={multiple}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
            
            {dragAndDrop ? (
                <div 
                    className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="drop-zone-content">
                        <p>Drag & drop MIDI files here</p>
                        <p>or</p>
                    </div>
                    <button
                        className="file-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Choose MIDI File'}
                    </button>
                </div>
            ) : (
                <button
                    className="file-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Choose MIDI File'}
                </button>
            )}

            {fileInfo && (
                <div className="file-info">
                    <div className="file-details">
                        <strong>File:</strong> {fileInfo.name}<br/>
                        <strong>Size:</strong> {formatFileSize(fileInfo.size)}<br/>
                        <strong>Type:</strong> {fileInfo.type || 'Unknown'}<br/>
                        <strong>Last Modified:</strong> {new Date(fileInfo.lastModified).toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
};