import React from 'react';
import { Star } from 'lucide-react';

const SimpleTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: '田中 美咲',
      company: '株式会社デジタルマーケ',
      role: 'マーケティング部長',
      content: '動画制作の時間が10分の1になり、月間のリード獲得数が3倍に増えました。もう手放せません。',
      rating: 5,
      image: '👩‍💼'
    },
    {
      name: '山田 太郎',
      company: 'ECサイト運営',
      role: '代表取締役',
      content: '商品紹介動画を量産できるようになり、売上が前年比150%成長。投資対効果は抜群です。',
      rating: 5,
      image: '👨‍💼'
    },
    {
      name: '佐藤 健二',
      company: 'スタートアップ',
      role: 'CEO',
      content: '限られた予算で大企業並みの動画マーケティングが可能に。競合との差別化に成功しました。',
      rating: 5,
      image: '👨‍💻'
    }
  ];

  const companies = [
    'Sony', 'Toyota', 'Nintendo', 'Panasonic', 'Rakuten', 'SoftBank'
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            導入企業の声
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            実際に成果を出している企業様の生の声をお聞きください
          </p>
        </div>

        {/* お客様の声カード */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl mr-3">
                  {testimonial.image}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.company}</p>
                </div>
              </div>

              <div className="flex mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>

              <p className="text-gray-700 italic">
                "{testimonial.content}"
              </p>

              <p className="text-sm text-gray-500 mt-4">
                {testimonial.role}
              </p>
            </div>
          ))}
        </div>

        {/* 企業ロゴ */}
        <div className="border-t border-gray-200 pt-12">
          <p className="text-center text-gray-600 mb-8">
            10,000社以上の企業に選ばれています
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {companies.map((company, index) => (
              <div key={index} className="text-2xl font-bold text-gray-400">
                {company}
              </div>
            ))}
          </div>
        </div>

        {/* 実績数値 */}
        <div className="mt-12 bg-indigo-50 rounded-xl p-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-indigo-600">平均3倍</p>
              <p className="text-gray-600">CVR向上率</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-600">90%削減</p>
              <p className="text-gray-600">制作時間</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-600">98%</p>
              <p className="text-gray-600">継続率</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleTestimonials;