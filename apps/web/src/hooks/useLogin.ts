import { IS_SHOW_LOGIN } from "@/components/Login/type";
import { inject, ref } from "vue";
import { useUserStore } from "@/stores/user";
import router from "@/router";
export const useLogin = () => {
  const isShowLogin = inject(IS_SHOW_LOGIN, ref(false));
  const userStore = useUserStore();
  const login = async () => {
    if (userStore.getUser) return true;

    isShowLogin.value = true;
    return false;
  };
  const logout = () => {
    userStore.logout(); //pinia的值清空
    router.push("/"); //跳转到首页
  };
  const hide = () => {
    isShowLogin.value = false;
  };
  return {
    login,
    hide,
    logout,
  };
};
