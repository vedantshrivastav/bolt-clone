// Line no 2
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderTree, ArrowLeft, Code2, PlayCircle, Code, Eye } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { BACKEND_URL } from '../config';
import axios from 'axios';
import { Step, StepType } from '../types';
import { parseXml } from '../steps';
import { fileItem } from '../types/index';
import useWebcontainers from '../hooks/useWebcontainers';

const BuilderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { prompt } = location.state || { prompt: '' };
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  // Mock steps for demonstration
  const [steps,setsteps] = useState<Step[]>([])

  const [files, setFiles] = useState<fileItem[]>([]);

  const webcontainer = useWebcontainers()

  // useEffect(() => {
  //   let originalFiles = [...files];  // Start with a copy of the existing files
  //   let updateHappened = false;
  
  //   // Process the steps and create files
  //   steps.filter(({ status }) => status === "pending").map(step => {
  //     updateHappened = true;
  //     if (step?.type === StepType.CreateFile) {
  //       let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
  //       let currentFileStructure = [...originalFiles]; // Start from the original files copy
  //       let finalAnswerRef = currentFileStructure;
    
  //       let currentFolder = "";
  //       while (parsedPath.length) {
  //         currentFolder = `${currentFolder}/${parsedPath[0]}`;
  //         let currentFolderName = parsedPath[0];
  //         parsedPath = parsedPath.slice(1);
    
  //         if (!parsedPath.length) {
  //           // Handle file creation
  //           let file = currentFileStructure.find(x => x.path === currentFolder);
  //           if (!file) {
  //             currentFileStructure.push({
  //               name: currentFolderName,
  //               type: 'file',
  //               path: currentFolder,
  //               content: step.code
  //             });
  //           } else {
  //             file.content = step.code; // Update existing file content
  //           }
  //         } else {
  //           // Handle folder creation
  //           let folder = currentFileStructure.find(x => x.path === currentFolder);
  //           if (!folder) {
  //             currentFileStructure.push({
  //               name: currentFolderName,
  //               type: 'folder',
  //               path: currentFolder,
  //               children: []
  //             });
  //           }
  
  //           // Move into the folder's children
  //           currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
  //         }
  //       }
  //       originalFiles = finalAnswerRef; // Ensure you update with the final file structure
  //     }
  //   });
  
  //   // If any update happened, set the new files structure
  //   if (updateHappened) {
  //     setFiles([...originalFiles]); // Ensure a new reference is set for files
  //     setsteps(steps => steps.map((s: Step) => ({
  //       ...s,
  //       status: "completed"
  //     })));
  //   }
  //   console.log("Updated files:", originalFiles);
  // }, [steps]);  // Only depend on 'steps' to avoid stale state issues
  
// Updated useEffect for file creation
useEffect(() => {
  let newFiles = [...files];
  let updateHappened = false;

  steps.filter(({ status }) => status === "pending").forEach(step => {
    updateHappened = true;
    if (step?.type === StepType.CreateFile && step.path && step.code) {
      const parsedPath = step.path?.split("/").filter(Boolean) ?? [];
      let currentPath = "";
      let currentLevel = newFiles;

      for (let i = 0; i < parsedPath.length; i++) {
        const segment = parsedPath[i];
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        
        if (i === parsedPath.length - 1) {
          // This is a file
          const fileIndex = currentLevel.findIndex(x => x.path === currentPath);
          if (fileIndex === -1) {
            currentLevel.push({
              name: segment,
              type: 'file',
              path: currentPath,
              content: step.code
            });
          } else {
            currentLevel[fileIndex].content = step.code;
          }
        } else {
          // This is a folder
          let folder = currentLevel.find(x => x.path === currentPath);
          if (!folder) {
            folder = {
              name: segment,
              type: 'folder',
              path: currentPath,
              children: []
            };
            currentLevel.push(folder);
          }
          currentLevel = folder.children!;
        }
      }
    }
  });

  if (updateHappened) {
    setFiles(newFiles);
    setsteps(steps => steps.map(s => ({
      ...s,
      status: "completed"
    })));
  }
}, [steps]);

  async function init(){
      const response =   await axios.post( `${BACKEND_URL}/templates`,{
        prompt : prompt.trim()
      })
      console.log("Getting the response from backend",response)
      const {prompts,uiPrompts} = response.data
      console.log(uiPrompts)
      setsteps(parseXml(uiPrompts[0]).map((x : Step) => (
        {
          ...x,
          status : "pending"
        }
      )))
      // console.log("Parsed Steps" , parseXml(uiPrompts[0]))

      try {
        console.log("Preparing chat request...");
        
        // Log the data you are sending
        console.log("Messages payload:", {
          messages: [
            ...prompts.map((p: any) => ({
              role: "user",
              content: p,  // assuming prompts is an array of strings
            })),
            { role: "user", content: prompt }, // assuming prompt is a string
          ],
        });
    
        const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
          messages: [
            ...prompts.map((p: any) => ({
              role: "user",
              content: p,  // assuming prompts is an array of strings
            })),
            { role: "user", content: prompt }, // assuming prompt is a string
          ],
        });
    
        // Log the response for debugging
        console.log("Response from /chat:", stepsResponse);


        setsteps(s => [...s,...parseXml(stepsResponse.data.response).map(x => ({
          ...x,
          status : "pending" as "pending"
        }))])


      } catch (error : any) {
        console.error("Error with /chat request:", error);
    
        if (error.response) {
          // Server responded with a status other than 2xx
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
          console.error("Response headers:", error.response.headers);
        } else if (error.request) {
          // Request was made but no response received
          console.error("No response received:", error.request);
        } else {
          // Something else caused the error
          console.error("Error message:", error.message);
        }
      }
      
  }

  useEffect(() => {
    console.log('Entered useEffect')
    init()
  },[])

  // Mock file structure for demonstration
  // const files = [
  //   { id: 1, name: 'src', type: 'folder', items: [
  //     { id: 2, name: 'components', type: 'folder', items: [
  //       { id: 3, name: 'Header.tsx', type: 'file', content: 'export default function Header() {\n  return <header>Header Component</header>;\n}' },
  //       { id: 4, name: 'Footer.tsx', type: 'file', content: 'export default function Footer() {\n  return <footer>Footer Component</footer>;\n}' },
  //     ]},
  //     { id: 5, name: 'App.tsx', type: 'file', content: 'import Header from "./components/Header";\nimport Footer from "./components/Footer";\n\nexport default function App() {\n  return (\n    <div>\n      <Header />\n      <main>Main Content</main>\n      <Footer />\n    </div>\n  );\n}' },
  //     { id: 6, name: 'index.tsx', type: 'file', content: 'import React from "react";\nimport ReactDOM from "react-dom";\nimport App from "./App";\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById("root")\n);' },
  //   ]},
  //   { id: 7, name: 'public', type: 'folder', items: [
  //     { id: 8, name: 'index.html', type: 'file', content: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>Preview</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>' },
  //   ]},
  // ];

  // const findFileContent = (items: any[], path: string[]): string => {
  //   for (const item of items) {
  //     if (item.type === 'file' && item.name === path[path.length - 1]) {
  //       return item.content;
  //     }
  //     if (item.type === 'folder' && item.items) {
  //       const content = findFileContent(item.items, path.slice(1));
  //       if (content) return content;
  //     }
  //   }
  //   return '';
  // };

  // const handleFileSelect = (filePath: string) => {
  //   setSelectedFile(filePath);
  //   const pathParts = filePath.split('/');
  //   const content = findFileContent(files, pathParts);
  //   setFileContent(content);
  // };
  const findFileContent = (items: fileItem[], path: string[]): string => {
    for (const item of items) {
      if (item.type === 'file' && item.path === path.join('/')) {
        return item.content || '';
      }
      if (item.type === 'folder' && item.children) {
        const content = findFileContent(item.children, path);
        if (content) return content;
      }
    }
    return '';
  };
  
  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    const pathParts = filePath.split('/');
    setFileContent(findFileContent(files, pathParts));
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left Sidebar - Steps */}
      <div className="w-96 bg-gray-800 border-r border-gray-700 p-6 overflow-y-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-300 hover:text-white mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </button>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-100">Your Prompt:</h2>
          <p className="text-gray-400 text-sm">{prompt}</p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`p-4 rounded-lg border ${
                step.status === 'completed'
                  ? 'bg-green-900/20 border-green-700'
                  : step.status === 'in-progress'
                  ? 'bg-indigo-900/20 border-indigo-700'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex items-center">
                {step.status === 'completed' ? (
                  <PlayCircle className="h-5 w-5 text-green-400 mr-3" />
                ) : step.status === 'in-progress' ? (
                  <Code2 className="h-5 w-5 text-indigo-400 mr-3" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-600 mr-3" />
                )}
                <span className={`${
                  step.status === 'completed'
                    ? 'text-green-400'
                    : step.status === 'in-progress'
                    ? 'text-indigo-400'
                    : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Split View */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="flex bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-6 py-3 flex items-center space-x-2 ${
              activeTab === 'code'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>Code</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 flex items-center space-x-2 ${
              activeTab === 'preview'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* File Explorer */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
            <div className="flex items-center mb-4">
              <FolderTree className="h-5 w-5 text-indigo-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-100">Files</h2>
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <FileItem
                  key={file.name} 
                  file={file}
                  level={0}
                  onSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
              ))}
            </div>
          </div>

          {/* Editor/Preview Area */}
          <div className="flex-1">
            {activeTab === 'code' ? (
              selectedFile ? (
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  theme="vs-dark"
                  value={fileContent}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    readOnly: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Select a file to view its contents
                </div>
              )
            ) : (
              <iframe
                src="about:blank"
                className="w-full h-full bg-white"
                title="Preview"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// const FileItem = ({ file, level, onSelect, selectedFile }: { file: any; level: number; onSelect: (path: string) => void; selectedFile: string | null }) => {
//   const [isOpen, setIsOpen] = React.useState(true);
//   const filePath = `${file.name}`;

//   const handleClick = () => {
//     if (file.type === 'folder') {
//       setIsOpen(!isOpen);
//     } else {
//       onSelect(filePath);
//     }
//   };

//   return (
//     <div style={{ marginLeft: `${level * 12}px` }}>
//       <div
//         className={`flex items-center p-2 hover:bg-gray-700/50 rounded cursor-pointer ${
//           file.type === 'folder'
//             ? 'text-indigo-400'
//             : filePath === selectedFile
//             ? 'text-white bg-gray-700'
//             : 'text-gray-300'
//         }`}
//         onClick={handleClick}
//       >
//         {file.type === 'folder' ? (
//           <FolderTree className="h-4 w-4 mr-2" />
//         ) : (
//           <Code2 className="h-4 w-4 mr-2" />
//         )}
//         <span className="text-sm">{file.name}</span>
//       </div>
//       {file.type === 'folder' && isOpen && file.items?.map((item: any) => (
//         <FileItem
//           key={item.id}
//           file={item}
//           level={level + 1}
//           onSelect={onSelect}
//           selectedFile={selectedFile}
//         />
//       ))}
//     </div>
//   );
// };

const FileItem = ({ file, level, onSelect, selectedFile }: { 
  file: fileItem; 
  level: number; 
  onSelect: (path: string) => void; 
  selectedFile: string | null 
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const handleClick = () => {
    if (file.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(file.path);
    }
  };

  return (
    <div style={{ marginLeft: `${level * 12}px` }}>
      <div
        className={`flex items-center p-2 hover:bg-gray-700/50 rounded cursor-pointer ${
          file.type === 'folder'
            ? 'text-indigo-400'
            : file.path === selectedFile
            ? 'text-white bg-gray-700'
            : 'text-gray-300'
        }`}
        onClick={handleClick}
      >
        {file.type === 'folder' ? (
          <FolderTree className="h-4 w-4 mr-2" />
        ) : (
          <Code2 className="h-4 w-4 mr-2" />
        )}
        <span className="text-sm">{file.name}</span>
      </div>
      {file.type === 'folder' && isOpen && file.children?.map((item) => (
        <FileItem
          key={item.path}
          file={item}
          level={level + 1}
          onSelect={onSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
};

export default BuilderPage;