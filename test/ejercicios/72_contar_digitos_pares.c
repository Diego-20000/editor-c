#include <stdio.h>
int main(void) {
    int N, D, C = 0;
    scanf("%d", &N);
    if (N < 0 || N > 2000000000) return 0;
    if (N == 0) C = 1;
    while (N > 0) { D = N % 10; if (D % 2 == 0) C++; N /= 10; }
    printf("Digitos pares: %d\n", C);
    return 0;
}
