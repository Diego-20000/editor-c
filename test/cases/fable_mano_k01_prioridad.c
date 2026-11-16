#include <stdio.h>
int main() { int A = 2, B = 3, C = 4; printf("%d %d %d %d\n", A + B * C, (A + B) * C, A - B - C, A * B / C * 2); printf("%d %d %d\n", A + B > C && C > B, A | B & C, A ^ B | C & 1); printf("%d %d %d\n", -A * B, !A + B, ~A + 1); printf("%d %d\n", A < B == B < C, A = B = C); printf("%d %d %d\n", 10 % 4 * 3, 2 + 3 << 1, 1 << 2 + 1); printf("%d\n", 7 & 3 == 3); return 0; }
