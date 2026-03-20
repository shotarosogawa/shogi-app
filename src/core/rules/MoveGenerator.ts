import { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { Piece, Player } from "../board/Piece"
import type { Position } from "../board/Position"
import { RuleValidator } from "./RuleValidator"

/**
 * 指し手生成クラス
 *
 * 盤面から「動ける手」を作る役割。
 *
 * まだこの段階では
 * 王手放置などは見ない。
 *
 * こういう手を
 *
 * 「擬似合法手」
 *
 * と呼びます。
 */
export class MoveGenerator {

  /**
   * 手番側の合法手を生成する
   *
   * 擬似合法手を作ったあと、
   * 王手放置になる手を除外する。
   */
  generateLegalMoves(board: Board): Move[] {
    const validator = new RuleValidator()

    return this.generatePseudoLegalMoves(board)
      .filter(move => validator.isLegalMove(board, move))
  }

  /**
   * 手番側の全ての擬似合法手を生成
   */
  generatePseudoLegalMoves(board: Board): Move[] {

    const moves: Move[] = []

    const currentPlayer = board.getTurn()

    // 盤面の全マスを調べる
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {

        const piece = board.getPiece({ x, y })

        if (!piece) continue

        // 自分の駒だけ対象
        if (piece.owner !== currentPlayer) continue

        moves.push(
          ...this.generateMovesForPiece(board, { x, y }, piece)
        )
      }
    }

    // 持ち駒の打ち手も追加
    moves.push(...this.generateDropMoves(board, currentPlayer))

    return moves
  }

  /**
   * 駒ごとの移動生成
   */
  generateMovesForPiece(
    board: Board,
    from: Position,
    piece: Piece
  ): Move[] {

    switch (piece.type) {

      case "FU":
        return this.generatePawnMoves(board, from, piece.owner)

      case "OU":
        return this.generateKingMoves(board, from, piece.owner)

      case "KI":
      case "TO":
      case "NG":
      case "NK":
      case "NY":
        return this.generateGoldMoves(board, from, piece.owner)

      case "GI":
        return this.generateSilverMoves(board, from, piece.owner)

      case "KE":
        return this.generateKnightMoves(board, from, piece.owner)

      case "KY":
        return this.generateLanceMoves(board, from, piece.owner)

      case "KA":
        return this.generateBishopMoves(board, from, piece.owner)

      case "HI":
        return this.generateRookMoves(board, from, piece.owner)

      case "UM":
        return this.generateHorseMoves(board, from, piece.owner)

      case "RY":
        return this.generateDragonMoves(board, from, piece.owner)

      default:
        // 未実装の駒
        return []
    }
  }

  /**
   * 持ち駒の打ち手を生成する
   *
   * まずは簡易版として、
   * 空いているマスならどこでも打てるものとする。
   *
   * 二歩、打ち歩詰め、行きどころのない打ちは
   * 後で RuleValidator 側で絞る。
   */
  private generateDropMoves(
    board: Board,
    owner: Player
  ): Move[] {
    const moves: Move[] = []

    const hand = board.getHand(owner)

    // 持ち駒がないなら何も打てない
    if (hand.length === 0) {
      return moves
    }

    // 持ち駒1枚ごとに、空いているマスへ打つ候補を作る
    for (const piece of hand) {
      for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
          const target = board.getPiece({ x, y })

          // 駒があるマスには打てない
          if (target) continue

          moves.push({
            to: { x, y },
            piece,
            drop: true
          })
        }
      }
    }

    return moves
  }

  /**
   * 歩の移動
   *
   * 前方1マス
   */
  private generatePawnMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    const forward = owner === "black" ? -1 : 1

    const directions = [
      { x: 0, y: forward },
    ]

    return this.generateStepMoves(
      board,
      from,
      owner,
      "FU",
      directions,
    )
  }

  /**
   * 玉の移動
   *
   * 8方向1マス
   */
  private generateKingMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    const directions = [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },

      { x: -1, y: 0 },
      { x: 1, y: 0 },

      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ]

    return this.generateStepMoves(
      board,
      from,
      owner,
      "OU",
      directions,
    )
  }

  /**
   * 金の移動
   *
   * 6方向1マス
   *
   * ※後ろ斜めには動けない
   */
  private generateGoldMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    // 先手と後手で前方向が違う
    const forward = owner === "black" ? -1 : 1

    const directions = [
      { x: 0, y: -forward },

      { x: -1, y: 0 },
      { x: 1, y: 0 },

      { x: -1, y: forward },
      { x: 0, y: forward },
      { x: 1, y: forward }
    ]

    return this.generateStepMoves(
      board,
      from,
      owner,
      "KI",
      directions,
    )
  }

  /**
   * 銀の移動
   *
   * 5方向1マス
   *
   * ※左右、真後ろには動けない
   */
  private generateSilverMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    // 先手と後手で前方向が違う
    const forward = owner === "black" ? -1 : 1

    const directions = [

      { x: -1, y: -forward },
      { x: 1, y: -forward },

      { x: -1, y: forward },
      { x: 0, y: forward },
      { x: 1, y: forward }
    ]

    return this.generateStepMoves(
      board,
      from,
      owner,
      "GI",
      directions,
    )
  }

  /**
   * 桂の移動
   *
   * 前2マス+横1マス
   */
  private generateKnightMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    // 先手と後手で前方向が違う
    const forward = owner === "black" ? -1 : 1

    const directions = [

      { x: -1, y: 2 * forward },
      { x: 1, y: 2 * forward }
    ]

    return this.generateStepMoves(
      board,
      from,
      owner,
      "KE",
      directions,
    )
  }

  /**
   * 香の移動
   *
   * 前方向に何マスでも
   */
  private generateLanceMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    // 先手と後手で前方向が違う
    const forward = owner === "black" ? -1 : 1

    return this.generateSlidingMoves(board, from, owner, "KY", 0, forward)
  }

  /**
   * 角の移動
   *
   * 斜め4方向に何マスでも
   */
  private generateBishopMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    return [
      ...this.generateSlidingMoves(board, from, owner, "KA", -1, -1),
      ...this.generateSlidingMoves(board, from, owner, "KA", 1, -1),
      ...this.generateSlidingMoves(board, from, owner, "KA", -1, 1),
      ...this.generateSlidingMoves(board, from, owner, "KA", 1, 1),
    ]
  }

  /**
   * 馬の移動
   *
   * 角の動き
   * +
   * 縦横1マス
   */
  private generateHorseMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    return [
      // 角の動き
      ...this.generateSlidingMoves(board, from, owner, "UM", -1, -1),
      ...this.generateSlidingMoves(board, from, owner, "UM", 1, -1),
      ...this.generateSlidingMoves(board, from, owner, "UM", -1, 1),
      ...this.generateSlidingMoves(board, from, owner, "UM", 1, 1),

      // 王の縦横1マス部分
      ...this.generateStepMoves(board, from, owner, "UM", [
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ])
    ]
  }

  /**
   * 飛車の移動
   *
   * 縦横4方向に何マスでも
   */
  private generateRookMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    return [
      ...this.generateSlidingMoves(board, from, owner, "HI", 0, -1),
      ...this.generateSlidingMoves(board, from, owner, "HI", 0, 1),
      ...this.generateSlidingMoves(board, from, owner, "HI", -1, 0),
      ...this.generateSlidingMoves(board, from, owner, "HI", 1, 0),
    ]
  }

  /**
   * 龍の移動
   *
   * 飛車の動き
   * +
   * 斜め1マス
   */
  private generateDragonMoves(
    board: Board,
    from: Position,
    owner: Player
  ): Move[] {

    return [
      // 飛車の動き
      ...this.generateSlidingMoves(board, from, owner, "RY", 0, -1),
      ...this.generateSlidingMoves(board, from, owner, "RY", 0, 1),
      ...this.generateSlidingMoves(board, from, owner, "RY", -1, 0),
      ...this.generateSlidingMoves(board, from, owner, "RY", 1, 0),

      // 王の斜め1マス部分
      ...this.generateStepMoves(board, from, owner, "RY", [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 },
      ])
    ]
  }

  /**
   * 1マス系 / 固定距離系の移動を生成する
   *
   * directions には相対移動量を入れる。
   * 例:
   *   玉なら8方向
   *   金なら6方向
   *   銀なら5方向
   *   桂なら2方向
   */
  private generateStepMoves(
    board: Board,
    from: Position,
    owner: Player,
    piece: Move["piece"],
    directions: Position[]
  ): Move[] {

    const moves: Move[] = []

    for (const dir of directions) {
      const to = {
        x: from.x + dir.x,
        y: from.y + dir.y
      }

      // 盤外ならスキップ
      if (!this.isInsideBoard(to)) continue

      const target = board.getPiece(to)

      // 自分の駒があるマスには行けない
      if (target && target.owner === owner) continue

      // 強制成りなら成り手だけ追加
      if (this.mustPromote(to, owner, piece)) {
        moves.push({
          from,
          to,
          piece,
          promote: true
        })
        continue
      }

      // 通常手
      moves.push({
        from,
        to,
        piece,
      })

      // 成れる場合は成れる手も追加
      if (this.canPromote(from, to, owner, piece)) {
        moves.push({
          from,
          to,
          piece,
          promote: true,
        })
      }
    }

    return moves
  }

  /**
   * 1方向にまっすぐ進む手を生成する
   *
   * 香・角・飛のような「スライディング駒」で使う。
   *
   * dx, dy で進む方向を表す。
   * 例:
   *   (0, -1)  = 上
   *   (1, -1)  = 右上
   *   (-1, 0)  = 左
   */
private generateSlidingMoves(
  board: Board,
  from: Position,
  owner: Player,
  piece: Move["piece"],
  dx: number,
  dy: number
): Move[] {

  const moves: Move[] = []

  let x = from.x + dx
  let y = from.y + dy

  // 1マスずつ進みながら調べる
  while (this.isInsideBoard({ x, y })) {
    const to = { x, y }
    const target = board.getPiece(to)

    // 自分の駒があるならその先には進めない
    if (target && target.owner === owner) {
      break
    }

    // 強制成りなら成り手だけ追加
    if (this.mustPromote(to, owner, piece)) {
      moves.push({
        from,
        to,
        piece,
        promote: true
      })
    } else {
      // 通常手
      moves.push({
        from,
        to,
        piece
      })

      // 成れる場合は成り手も追加
      if (this.canPromote(from, to, owner, piece)) {
        moves.push({
          from,
          to,
          piece,
          promote: true
        })
      }
    }

    // 相手駒を取る場合はそのマスで終了
    if (target) {
      break
    }

    x += dx
    y += dy
  }

  return moves
}

  /**
   * 盤外チェック
   */
  private isInsideBoard(pos: Position): boolean {

    return (
      pos.x >= 0 &&
      pos.x < 9 &&
      pos.y >= 0 &&
      pos.y < 9
    )
  }

  /**
   * 成りゾーンか判定
   */
  private isPromotionZone(pos: Position, owner: Player): boolean {
    if (owner === "black") {
      return pos.y <= 2
    } else {
      return pos.y >= 6
    }
  }

  /**
   * 成れるか判定
   */
  private canPromote(
    from: Position,
    to: Position,
    owner: Player,
    piece: Move["piece"]
  ): boolean {

    // 成れない駒
    if (piece === "OU" || piece === "KI" || piece === "TO" || piece === "NG" || piece === "NK" || piece === "NY" || piece === "RY" || piece === "UM") {
      return false
    }

    return (
      this.isPromotionZone(from, owner) ||
      this.isPromotionZone(to, owner)
    )
  }

  /**
   * 強制成りか判定する
   *
   * - 歩 / 香 → 最終段は強制成り
   * - 桂 → 最終段・その1つ手前は強制成り
   */
  private mustPromote(
    to: Position,
    owner: Player,
    piece: Move["piece"]
  ): boolean {
    if (owner === "black") {
      if ((piece === "FU" || piece === "KY") && to.y === 0) {
        return true
      }

      if (piece === "KE" && (to.y === 0 || to.y === 1)) {
        return true
      }
    } else {
      if ((piece === "FU" || piece === "KY") && to.y === 8) {
        return true
      }

      if (piece === "KE" && (to.y === 8 || to.y === 7)) {
        return true
      }
    }

    return false
  }
}