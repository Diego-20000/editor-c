#include <stdio.h>
int main(void) {
    int N, S = 0;
    scanf("%d", &N);
    if (N < 0 || N > 2000000000) return 0;
    while (N > 0) { S += N % 10; N /= 10; }
    printf("Suma de digitos: %d\n", S);
    return 0;
}
