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
      },
    },
  },
} as const;
