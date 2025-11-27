from fastmcp import FastMCP
from perplexity import Perplexity

mcp = FastMCP("Perplexity Chat Tool")

def classify_query_general(query: str) -> str:
    """
    Phân loại query toàn diện đời sống:
    - chat: kiến thức, học thuật, lập trình, giải thích
    - search-lite: giá cả, kinh tế, tài chính, sức khỏe, đời sống, giáo dục
    - search-pro: thời sự, thiên tai, chiến sự, tình hình nóng
    - analysis: bảng, JSON, báo cáo, so sánh
    """
    q = query.lower()

    breaking_keywords = [
        "cập nhật", "mới nhất", "tình hình", "diễn biến",
        "breaking", "hiện tại", "hôm nay", "vừa xảy ra",
        "thiên tai", "bão", "lũ", "động đất", "cháy", "tai nạn",
        "chiến sự", "xung đột"
    ]

    finance_keywords = ["giá vàng", "btc", "crypto", "chứng khoán", "usd", "giá xăng", "thị trường", "đầu tư"]

    life_keywords = ["sức khoẻ", "bệnh", "dịch", "tiêm", "giáo dục", "học sinh", "trường học", "gia đình"]

    analysis_keywords = ["so sánh", "bảng", "json", "thống kê", "report", "danh sách"]

    if any(k in q for k in breaking_keywords):
        return "search-pro"
    if any(k in q for k in finance_keywords):
        return "search-lite"
    if any(k in q for k in life_keywords):
        return "search-lite"
    if any(k in q for k in analysis_keywords):
        return "analysis"

    return "chat"

@mcp.tool(
    name="perplexity_chat",
    description="""
    Công cụ hỏi–đáp Perplexity AI (toàn diện đời sống, kinh tế, xã hội, giáo dục, sức khỏe, thiên tai, kỹ thuật, lập trình),
    tự phân loại query để chọn chế độ phù hợp: chat, search-lite, search-pro, analysis.

    Tham số:
    - query: nội dung cần hỏi hoặc tác vụ cần xử lý.
    - schema (tùy chọn): JSON schema để yêu cầu kết quả theo cấu trúc cố định.

    Kết quả:
    - Nếu không có schema → trả về văn bản phân tích.
    - Nếu có schema → trả về JSON theo đúng cấu trúc định nghĩa.
    """
)
def perplexity_chat(input: dict) -> dict:
    client = Perplexity()
    query = input.get("query", "")
    schema = input.get("schema")

    mode = classify_query_general(query)

    try:
        params = {"messages": [{"role": "user", "content": query}]}

        if mode == "chat":
            params["model"] = "sonar"
        elif mode == "search-lite":
            params["model"] = "sonar"
            params["search"] = True
        elif mode == "search-pro":
            params["model"] = "sonar-pro"
            params["search"] = True
            params["search_recency_days"] = 3
        elif mode == "analysis":
            params["model"] = "sonar-pro"
            params["search"] = True

        if schema:
            params["response_format"] = {
                "type": "json_schema",
                "json_schema": {"schema": schema}
            }

        completion = client.chat.completions.create(**params)

        return {
            "success": True,
            "mode": mode,
            "result": completion.choices[0].message.content
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    mcp.run(transport="stdio")
