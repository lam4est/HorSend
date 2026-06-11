FROM python:3.12-slim
WORKDIR /app

COPY requirements-inference.txt ./
RUN pip install --no-cache-dir -r requirements-inference.txt

COPY inference ./inference

ENV PYTHONPATH=/app
EXPOSE 8001

CMD ["uvicorn", "inference.server:app", "--host", "0.0.0.0", "--port", "8001"]
