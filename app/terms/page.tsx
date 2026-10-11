export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-charcoal rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">서비스 이용약관</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-600 mb-8">
              <strong>디지로그랩스 주식회사</strong>(이하 "회사")가 제공하는 Clipwise 서비스(이하 "서비스")의 이용과 관련하여 
              회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700">
                본 약관은 회사가 제공하는 Clipwise 서비스의 이용조건 및 절차, 회사와 이용자 간의 권리, 의무 및 책임사항, 
                기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제2조 (정의)</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>"서비스"란 회사가 제공하는 Clipwise AI 지식 시스템 구축 및 운영 서비스를 의미합니다.</li>
                <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
                <li>"회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
                <li>"비회원"이란 회원에 가입하지 않고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                <li>"콘텐츠"란 서비스를 통해 제공되는 영상, 텍스트, 이미지 등 모든 정보를 의미합니다.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제3조 (약관의 게시와 개정)</h2>
              <p className="text-gray-700 mb-4">
                회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
              </p>
              <p className="text-gray-700">
                회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다. 
                약관이 개정되는 경우 회사는 개정된 약관의 내용과 시행일을 명시하여 현행약관과 함께 서비스의 초기화면에 
                그 시행일 7일 이전부터 시행일 후 상당한 기간 동안 공지합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제4조 (회원가입)</h2>
              <p className="text-gray-700 mb-4">
                이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.
              </p>
              <p className="text-gray-700">
                회사는 제1항과 같이 회원가입을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-4">
                <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제5조 (서비스의 제공 및 변경)</h2>
              <p className="text-gray-700 mb-4">회사는 다음과 같은 서비스를 제공합니다:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Clipwise AI 지식 시스템 구축 서비스</li>
                <li>영상 콘텐츠의 STT 변환 및 벡터화 서비스</li>
                <li>AI 챗봇, 요약, 검색, 지식카드 생성 서비스</li>
                <li>서비스 운영 및 관리 서비스</li>
              </ul>
              <p className="text-gray-700 mt-4">
                회사는 서비스의 내용, 제공 방법, 제공 시간을 변경할 수 있으며, 변경 시에는 변경 사유 및 변경 내용을 
                사전에 공지합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제6조 (서비스의 중단)</h2>
              <p className="text-gray-700 mb-4">
                회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 
                서비스의 제공을 일시적으로 중단할 수 있습니다.
              </p>
              <p className="text-gray-700">
                회사는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 
                배상합니다. 단, 회사가 고의 또는 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제7조 (이용자의 의무)</h2>
              <p className="text-gray-700 mb-4">이용자는 다음 행위를 하여서는 안 됩니다:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>신청 또는 변경 시 허위내용의 등록</li>
                <li>타인의 정보 도용</li>
                <li>회사가 게시한 정보의 변경</li>
                <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제8조 (개인정보보호)</h2>
              <p className="text-gray-700">
                회사는 이용자의 개인정보 수집 시 서비스 제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.
                회사는 회원가입 시 구매계약이행에 필요한 정보를 미리 수집하지 않습니다.
                회사의 개인정보 처리에 대해서는 관련법령 및 회사가 별도로 고지하는 개인정보 처리방침이 적용됩니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제9조 (회사의 의무)</h2>
              <p className="text-gray-700 mb-4">회사는 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 
              지속적이고 안정적으로 서비스를 제공하기 위하여 노력합니다.</p>
              <p className="text-gray-700">
                회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보(신용정보 포함) 보호를 위해 보안시스템을 구축하며 
                개인정보 처리방침을 공시하고 준수합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제10조 (요금 및 결제)</h2>
              <p className="text-gray-700 mb-4">
                서비스 이용 요금은 월 29,000원(부가세 포함)이며, 회사가 제공하는 서비스의 구축 및 운영 비용을 포함합니다.
              </p>
              <p className="text-gray-700">
                이용자는 서비스 이용에 필요한 API 키 등을 직접 구매하여 설정해야 할 수 있으며, 
                이에 대한 비용은 이용자가 부담합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제11조 (계약해지 및 이용제한)</h2>
              <p className="text-gray-700 mb-4">
                이용자는 언제든지 회사에게 회원 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.
              </p>
              <p className="text-gray-700">
                회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 
                경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제12조 (손해배상)</h2>
              <p className="text-gray-700">
                회사는 무료로 제공되는 서비스와 관련하여 회원에게 어떠한 손해가 발생하더라도 동 손해가 회사의 중대한 과실에 의한 경우를 제외하고 
                이에 대하여 책임을 부담하지 아니합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제13조 (면책조항)</h2>
              <p className="text-gray-700 mb-4">
                회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
              </p>
              <p className="text-gray-700">
                회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제14조 (준거법 및 관할법원)</h2>
              <p className="text-gray-700 mb-4">
                회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 
                주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다.
              </p>
              <p className="text-gray-700">
                회사와 이용자 간에 제기된 전자상거래 소송에는 한국법을 적용합니다.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                본 약관은 2025년 1월 1일부터 시행됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


