#include <stdio.h>
int main(void) {
    int N, A, B, C, S;
    scanf("%d", &N);
    if (N < 100 || N > 999) return 0;
    A = N / 100; B = (N / 10) % 10; C = N % 10;
    S = A * A * A + B * B * B + C * C * C;
    if (S == N) printf("Es Armstrong\n");
    else printf("No es Armstrong\n");
    return 0;
}
