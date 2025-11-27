from fastmcp import FastMCP
from google import genai
import os

mcp = FastMCP("Gemini Summary Tool")

@mcp.tool(
    name="summary_gemini",
    description="""
    Tóm tắt ngắn gọn, chọn lọc nội dung chính của một thông tin nhận được từ công cụ tìm kiếm (ví dụ: Perplexity).
    Tool này đặc biệt phù hợp để trả lời nhanh, trọng tâm cho người dùng về các vấn đề như giá vàng, chứng khoán, diễn biến thị trường, tóm tắt tin tức, báo cáo dài thành bản rút gọn dễ hiểu.
    Có thể dùng để đơn giản hóa thông tin khó, hoặc chỉ lấy dữ liệu quan trọng nhất (ví dụ: 'giá vàng hôm nay là bao nhiêu?' – output: 'Vàng SJC: ..., vàng 9999: ..., vàng nhẫn trơn: ...').
    Output luôn giữ ngắn gọn, rõ ràng, hạn chế thông tin thừa, tập trung đúng vào kết quả/vấn đề người hỏi quan tâm.
    """
)
def summarize(content: str) -> dict:
    """
    Nhận nội dung dài/phức tạp, tóm tắt lấy ý chính nhất, trả về cho user dưới dạng rút gọn dễ hiểu.
    Nếu là giá vàng, giá chứng khoán, output nên là bảng hoặc danh sách giá, currency rõ ràng.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        prompt = (
            "Tóm tắt nội dung sau một cách súc tích, trả lời trọng tâm nhất cho người dùng Việt Nam. "
            "Nếu là câu hỏi về giá vàng, giá chứng khoán,... vui lòng trả lời từng loại vàng/chứng khoán cụ thể với giá trị số, ví dụ: "
            "'Vàng SJC: ..., vàng 9999: ..., vàng nhẫn trơn: ...' hoặc 'VNM: ..., VN-Index: ...'. "
            "Hạn chế thông tin thừa, không lòng vòng, chỉ đưa ra kết quả cần thiết để người dùng dễ tra cứu.\n\n"
            f"---\nNội dung cần tóm tắt:\n{content}"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"success": True, "summary": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    mcp.run(transport="stdio")
