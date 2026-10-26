import axios from "axios";

const baseURL = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (
    typeof FormData !== "undefined" &&
    config.data instanceof FormData
  ) {
    config.headers.delete("Content-Type");
  }

  return config;
});

// baseURL: "https://hrms-backend-ms3u.onrender.com/api",


// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error.response?.status;

//     if (!status) {
//       console.error("Network error");
//       return Promise.reject(error);
//     }

//     return Promise.reject({
//       status,
//       message: error.response?.data?.message || "Request failed",
//       original: error,
//     });
//   }
// );

// api/axios.ts mein, apne existing interceptor ki jagah ye rakho
// (file ke top par `import axios from "axios";` hona chahiye, jo aapke
// paas api instance banane ke liye pehle se hoga)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Agar server se response aaya hai (jaise 503, 400, 401, etc.)
    if (error.response) {
      const serverMessage = error.response.data?.message;
      const status = error.response.status;

      // Agar backend ne koi message bheja hai (jaise DB down ya invalid credentials)
      if (serverMessage) {
        const customError = new Error(serverMessage) as any;
        customError.status = status;
        return Promise.reject(customError);
      }
    }

    // Agar server band hai / render so raha hai (network error)
    if (!error.response) {
      return Promise.reject(
        new Error("Cannot reach the server. It may be starting up, please try again in a minute.")
      );
    }

    return Promise.reject(error);
  }
);