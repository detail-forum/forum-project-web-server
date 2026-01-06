export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-primary/10 via-white to-secondary/10 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            개발자들을 위한
            <br />
            <span className="text-primary">SNS 서비스</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            지식을 공유하고 소통하는 공간입니다.
            <br />
            다양한 주제의 게시글을 작성하고 읽어보세요.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span>자유로운 글쓰기</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span>실시간 소통</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span>지식 공유</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

