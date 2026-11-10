#include <stdio.h>
int main(void) {
    int N, D[12], C = 0, I;
    scanf("%d", &N);
    if (N < 0) return 0;
    if (N == 0) D[C++] = 0;
    while (N > 0) { D[C++] = N % 8; N /= 8; }
    printf("Octal: ");
    for (I = C - 1; I >= 0; I--) printf("%d", D[I]);
    printf("\n");
    return 0;
}
