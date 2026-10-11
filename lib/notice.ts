import { toast } from "react-hot-toast";

/** 알림·정보 표시는 이 모듈로만 호출한다. 표시는 공통 `NoticeLayer`가 담당한다. */
export const notice = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string) => toast.dismiss(id),
};

/** 클립보드 복사 후 결과를 레이어드 팝업으로 알린다. */
export async function copyWithNotice(value: string, message = "복사되었습니다.") {
  try {
    await navigator.clipboard.writeText(value);
    notice.success(message);
    return true;
  } catch {
    notice.error("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    return false;
  }
}
