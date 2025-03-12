"use client";

import Link from "next/link";
import { Message, useAssistant as useAssistant } from "@ai-sdk/react";
import {useEffect, useRef, useState } from "react";
import Image from 'next/image';

import { UploadFile } from "@/components/UploadFile";
import { FileUploadResult } from "@/app/types";
import { getMessageWithImage } from "@/lib/utils";

interface Error {
  name: string;
  message: string;
  stack?: string;
}

interface ViewMessage extends Message {
  id: string;
  content: string;
  role: "system" | "user" | "assistant" | "data";
  base64Strings?: string[];
  fileNames?: string[];
  completed?: boolean;
}

const roleToColorMap: Record<Message["role"], string> = {
  system: "red",
  user: "black",
  assistant: "green",
  data: "orange",
};

export default function Chat() {
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(null);
  const [viewMessages, setViewMessages] = useState<ViewMessage[]>([]);
  const {
    status,
    messages,
    input,
    threadId,
    submitMessage,
    handleInputChange,
    error,
    stop,
  } = useAssistant({ api: "/api/assistant",body: {"fileId": uploadResult?.fileId} });

  // When status changes to accepting messages, focus the input:
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (status === "awaiting_message") {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleUploadResult = (result: FileUploadResult) => {
    setUploadingFile(true);
    setUploadResult(result);
    setUploadingFile(false);
  };


  useEffect(() => {
    // updateViewMessages(messages)
    async function updateMessages() {
      const updatedMessages: ViewMessage[] = [...viewMessages];

      if (status === "in_progress") {
        if (messages.length === viewMessages.length) {
          // Update the content of the last message
          const lastMessage = messages[messages.length - 1];
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: lastMessage.content,
          };
        } else {
          // Add new messages to viewMessages
          for (let i = viewMessages.length; i < messages.length; i++) {
            updatedMessages.push(messages[i]);
          }
        }
      } else if (status === "awaiting_message") {
        if (messages.length === viewMessages.length) {
          // Add base64Strings and set completed flag
          for (let i = 0; i < messages.length; i++) {
            const messageId = messages[i].id;
            const getMessageWithImageResponse = await getMessageWithImage(threadId as string, messageId);
            const base64Strings = getMessageWithImageResponse.base64Strings;
            const fileNames = getMessageWithImageResponse.fileNames;
            updatedMessages[i] = {
              ...updatedMessages[i],
              base64Strings: base64Strings,
              fileNames: fileNames,
              completed: true,
            };
          }
        } else {
          // Add new messages to viewMessages and set completed flag
          for (let i = viewMessages.length; i < messages.length; i++) {
            const messageId = messages[i].id;
            const getMessageWithImageResponse = await getMessageWithImage(threadId as string, messageId);
            const base64Strings = getMessageWithImageResponse.base64Strings;
            const fileNames = getMessageWithImageResponse.fileNames;
            updatedMessages.push({
              ...messages[i],
              base64Strings: base64Strings,
              fileNames: fileNames,
              completed: true,
            });
          }
        }
      }
      console.log("Updated messages:", updatedMessages);
      setViewMessages(updatedMessages);
    }
    updateMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status, threadId]);



  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {error != null && (
        <div className="relative px-6 py-4 text-white bg-red-500 rounded-md">
          <span className="block sm:inline">
            Error: {(error as Error).toString()}
          </span>
        </div>
      )}

      {viewMessages.map((m: ViewMessage) => (
        <div
          key={m.id}
          className="whitespace-pre-wrap"
          style={{ color: roleToColorMap[m.role] }}
        >
          <strong>{`${m.role}: `}</strong>
          {m.content}
          {m.fileNames&& <h1 style={{color: 'black'}}>ファイルリンク:</h1>}
          {m.fileNames && m.fileNames.map((fileName, index) => (
            <ul key={index} style={{color: 'blue',textDecoration: 'underline'}}>
              <li>
                <Link href={`/api/images/${fileName}`} target="_blank" rel="noopener noreferrer">
                  {fileName}
                </Link>
              </li>
            </ul> 
          ))}
          {m.base64Strings && m.base64Strings.map((base64String, index) => (
            <Image key={index} src={`data:image/png;base64,${base64String}`} alt="Uploaded" width={500} height={500} />
          ))}
          <br />
          <br />
        </div>
      ))}

      {status === "in_progress" && (
        <div className="w-full h-8 max-w-md p-2 mb-8 bg-gray-300 rounded-lg dark:bg-gray-600 animate-pulse" />
      )}

      <form onSubmit={submitMessage}>
        <input
          ref={inputRef}
          disabled={status !== "awaiting_message"}
          className="fixed w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl bottom-14 ax-w-md"
          value={input}
          placeholder="Excelで解析したい内容を入力してください"
          onChange={handleInputChange}
        />
      </form>
      <div className="fixed bottom-34">
        <UploadFile uploading={uploadingFile} setUploading={setUploadingFile} onUploadResult={handleUploadResult}/>
      </div>

      <button
        className="fixed bottom-0 w-full max-w-md p-2 mb-8 text-white bg-red-500 rounded-lg"
        onClick={stop}
      >
        Stop
      </button>
    </div>
  );
}
