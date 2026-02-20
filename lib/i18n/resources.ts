export const SUPPORTED_LANGUAGES = ["en", "es"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "cv-io-language";

export const resources = {
  en: {
    translation: {
      language: {
        english: "EN",
        spanish: "ES",
        switchAria: "Change application language",
      },
      sidebar: {
        brandTagline: "AI resume workspace",
        welcomeTitle: "Welcome!",
        welcomeBody: "Upload your first CV to start building your profile.",
        cvsTitle: "My CVs",
        newButton: "New",
        loadingState: "Loading CVs...",
        emptyState: "You don't have CVs yet. Create one from chat or upload a PDF.",
        themeSwitchAria: "Switch between light and dark mode",
      },
      home: {
        attachPdfLabel: "Attach your CV in PDF",
        uploadHomeTitle: "Upload your resume in PDF",
        uploadHomeSubtitle:
          "Drag and drop your file here, or select it to import and start building your CV.",
        selectPdfButton: "Select PDF",
        fileLoadedTitle: "Your file is ready",
        removeSelectedFileButton: "Remove file",
        uploadSelectedButton: "Upload selected file",
        noFileSelectedError: "No file selected.",
        invalidFileType: "Only PDF files are allowed.",
        onlyOneFileAllowedError: "Please upload only one file.",
        fileAlreadySelectedError: "A file is already selected. Remove it first.",
        uploadFailed: "Upload request failed",
        uploadSuccess: "CV uploaded successfully",
        uploadAndParseSuccess: "CV uploaded and parsed successfully",
        uploadError: "Could not upload CV. Please try again.",
        uploadCompleteMessage:
          "Great. I parsed your PDF and stored your CV data automatically.",
        titleReady: "Your CV is ready to upload",
        titleQuestion: "How can I help you with your CV?",
        uploadPdfButton: "Upload PDF",
        dropFileHint: "Drop the file to attach it",
        promptPlaceholder: "Describe your profile or paste a job post to tailor your CV...",
        sendButton: "Send",
        uploading: "Uploading...",
        uploadCv: "Upload CV",
        dragAndDropHint: "Drag and drop a PDF anywhere on this screen.",
        assistantThinking: "Assistant is thinking...",
        assistantAutoReply:
          "Thanks. I can help refine your CV summary, achievements, and skills based on your target role.",
        selectCvMessage: "Pick a CV from the sidebar to start writing in chat.",
        initialCvMessage: "How can I help you with this CV today?",
        writeOnlyOnCvRoute: "You can only write when you are on route /cv/[id].",
        modelThinking: "The model is thinking...",
        chatFailedTitle: "Could not complete chat request",
        chatFailedNetwork: "Connection to chat service failed. Please try again.",
        chatFailedUnexpected: "Unexpected error while processing chat request.",
        chatMissingApiKey:
          "OPENAI_API_KEY is missing on the server. Chat responses are disabled.",
        chatInvalidRequest: "Invalid chat request payload.",
        chatCvNotFound: "Requested CV was not found.",
        chatEmptyResponse: "The model returned an empty response.",
        viewChat: "Chat",
        viewTemplates: "Templates",
        templatesTitle: "CV Templates",
        templatesSubtitle:
          "Select any template to open a full preview with the same resume information.",
        templateKindClassic: "Classic",
        templateKindStyled: "Styled",
        templatesPreviewAction: "Preview",
        templatesPreviewTitle: "Template Preview",
        templatesPreviewSubtitle:
          "The same resume data is rendered with a different structure per template.",
        templatesBackButton: "Back to templates",
      },
    },
  },
  es: {
    translation: {
      language: {
        english: "EN",
        spanish: "ES",
        switchAria: "Cambiar idioma de la aplicación",
      },
      sidebar: {
        brandTagline: "Espacio de trabajo de CV con IA",
        welcomeTitle: "¡Bienvenido!",
        welcomeBody: "Sube tu primer CV para empezar a construir tu perfil.",
        cvsTitle: "Mis CVs",
        newButton: "Nuevo",
        loadingState: "Cargando CVs...",
        emptyState: "Aún no tienes CVs. Crea uno desde el chat o sube un PDF.",
        themeSwitchAria: "Cambiar entre modo claro y oscuro",
      },
      home: {
        attachPdfLabel: "Adjunta tu CV en PDF",
        uploadHomeTitle: "Sube tu CV en PDF",
        uploadHomeSubtitle:
          "Arrastra y suelta tu archivo aquí, o selecciónalo para importarlo y empezar a construir tu CV.",
        selectPdfButton: "Seleccionar PDF",
        fileLoadedTitle: "Tu archivo está listo",
        removeSelectedFileButton: "Quitar archivo",
        uploadSelectedButton: "Subir archivo seleccionado",
        noFileSelectedError: "No hay ningún archivo seleccionado.",
        invalidFileType: "Solo se permiten archivos PDF.",
        onlyOneFileAllowedError: "Sube solo un archivo.",
        fileAlreadySelectedError: "Ya hay un archivo seleccionado. Quítalo primero.",
        uploadFailed: "La solicitud de carga falló",
        uploadSuccess: "CV subido correctamente",
        uploadAndParseSuccess: "CV subido y parseado correctamente",
        uploadError: "No se pudo subir el CV. Intenta de nuevo.",
        uploadCompleteMessage:
          "Perfecto. Ya parseé tu PDF y guardé los datos del CV automáticamente.",
        titleReady: "Tu CV está listo para subir",
        titleQuestion: "¿En qué puedo ayudarte con tu CV?",
        uploadPdfButton: "Subir PDF",
        dropFileHint: "Suelta el archivo para adjuntarlo",
        promptPlaceholder: "Describe tu perfil o pega una vacante para adaptar tu CV...",
        sendButton: "Enviar",
        uploading: "Subiendo...",
        uploadCv: "Subir CV",
        dragAndDropHint: "Arrastra y suelta un PDF en cualquier parte de esta pantalla.",
        assistantThinking: "El asistente está pensando...",
        assistantAutoReply:
          "Gracias. Puedo ayudarte a mejorar el resumen, logros y habilidades de tu CV según el rol objetivo.",
        selectCvMessage:
          "Selecciona un CV desde la barra lateral para empezar a escribir en el chat.",
        initialCvMessage: "Cómo puedo ayudarte con este CV hoy?",
        writeOnlyOnCvRoute:
          "Solo puedes escribir cuando estás dentro de la ruta /cv/[id].",
        modelThinking: "El modelo está pensando...",
        chatFailedTitle: "No se pudo completar la solicitud del chat",
        chatFailedNetwork:
          "Falló la conexión con el servicio de chat. Intenta nuevamente.",
        chatFailedUnexpected:
          "Ocurrió un error inesperado al procesar la solicitud del chat.",
        chatMissingApiKey:
          "Falta OPENAI_API_KEY en el servidor. Las respuestas del chat están deshabilitadas.",
        chatInvalidRequest: "La solicitud del chat es inválida.",
        chatCvNotFound: "No se encontró el CV solicitado.",
        chatEmptyResponse: "El modelo devolvió una respuesta vacía.",
        viewChat: "Chat",
        viewTemplates: "Plantillas",
        templatesTitle: "Plantillas de CV",
        templatesSubtitle:
          "Selecciona cualquier plantilla para abrir su vista previa con la misma informacion.",
        templateKindClassic: "Clásico",
        templateKindStyled: "Estilizado",
        templatesPreviewAction: "Vista previa",
        templatesPreviewTitle: "Vista previa de plantilla",
        templatesPreviewSubtitle:
          "La misma informacion de la hoja de vida se muestra con una estructura distinta por plantilla.",
        templatesBackButton: "Volver a plantillas",
      },
    },
  },
} as const;
